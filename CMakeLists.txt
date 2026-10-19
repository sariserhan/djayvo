cmake_minimum_required(VERSION 3.20)
project(Djayvo VERSION 0.2.0 LANGUAGES C CXX)

option(DJAYVO_SANITIZERS "Enable address and undefined-behavior sanitizers" OFF)
include(CTest)

add_library(djayvo_core STATIC
  core/composition/plan.cpp
  core/arrangement/demo.cpp
  core/arrangement/remix.cpp
  core/composition/analysis.cpp
  core/composition/remix_plan.cpp
  core/instruments/voice.cpp
  core/audio/live.cpp
  core/audio/session.cpp
  core/audio/renderer.cpp
  core/audio/input.cpp
  core/audio/remix_renderer.cpp
  core/audio/remix_file.cpp
  core/audio/c_api.cpp
  core/audio/wav.cpp)
target_include_directories(djayvo_core PUBLIC core/include)
target_compile_features(djayvo_core PUBLIC cxx_std_17)
set_target_properties(djayvo_core PROPERTIES CXX_EXTENSIONS OFF POSITION_INDEPENDENT_CODE ON)
if(MSVC)
  target_compile_options(djayvo_core PRIVATE /W4 /fp:precise)
else()
  target_compile_options(djayvo_core PRIVATE -Wall -Wextra -Wpedantic -Wconversion -Wshadow -fno-fast-math)
endif()
if(DJAYVO_SANITIZERS)
  if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(djayvo_core PUBLIC -fsanitize=address,undefined -fno-omit-frame-pointer)
    target_link_options(djayvo_core PUBLIC -fsanitize=address,undefined)
  else()
    message(FATAL_ERROR "DJAYVO_SANITIZERS requires GCC or Clang")
  endif()
endif()

add_executable(djayvo_render tools/cli/main.cpp)
target_link_libraries(djayvo_render PRIVATE djayvo_core)
add_executable(djayvo_remix tools/cli/remix_main.cpp tools/cli/plan_import.cpp)
target_link_libraries(djayvo_remix PRIVATE djayvo_core)

if(EMSCRIPTEN)
  # Browser isolation replaces filesystem publication; the shared DSP is unchanged.
  target_compile_options(djayvo_core PRIVATE -fexceptions)
  add_executable(djayvo_web apps/web/bridge.cpp)
  target_link_libraries(djayvo_web PRIVATE djayvo_core)
  target_compile_options(djayvo_web PRIVATE -fexceptions)
  target_link_options(djayvo_web PRIVATE
    -fexceptions --no-entry
    "-sEXPORTED_FUNCTIONS=['_djayvo_web_render','_djayvo_web_session']"
    "-sEXPORTED_RUNTIME_METHODS=['ccall','FS']"
    -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker,node
    -sALLOW_MEMORY_GROWTH=1 -sMAXIMUM_MEMORY=536870912 -sSTACK_SIZE=2097152)
  set_target_properties(djayvo_web PROPERTIES SUFFIX ".mjs")
  add_executable(djayvo_live core/audio/live.cpp)
  target_link_libraries(djayvo_live PRIVATE djayvo_core)
  target_link_options(djayvo_live PRIVATE --no-entry
    "-sEXPORTED_FUNCTIONS=['_djayvo_live_init','_djayvo_live_note','_djayvo_live_off','_djayvo_live_panic','_djayvo_live_buffer','_djayvo_live_render','_djayvo_live_active','_djayvo_live_mouth','_djayvo_next_bar']"
    -sSTANDALONE_WASM=1 -sFILESYSTEM=0 -sALLOW_MEMORY_GROWTH=0
    -sINITIAL_MEMORY=33554432 -sSTACK_SIZE=262144)
  set_target_properties(djayvo_live PROPERTIES SUFFIX ".wasm")
endif()

if(BUILD_TESTING)
  add_executable(djayvo_session_render core/tests/session_render.cpp)
  target_link_libraries(djayvo_session_render PRIVATE djayvo_core)
  add_executable(djayvo_live_tests core/tests/live_tests.cpp)
  target_link_libraries(djayvo_live_tests PRIVATE djayvo_core)
  add_test(NAME live_instruments COMMAND djayvo_live_tests)
  add_executable(djayvo_tests core/tests/tests.cpp)
  target_link_libraries(djayvo_tests PRIVATE djayvo_core)
  add_test(NAME core COMMAND djayvo_tests)
  add_executable(djayvo_remix_tests core/tests/remix_tests.cpp)
  target_link_libraries(djayvo_remix_tests PRIVATE djayvo_core)
  add_test(NAME remix_core COMMAND djayvo_remix_tests)
  add_executable(djayvo_c_smoke core/tests/c_api_smoke.c)
  target_link_libraries(djayvo_c_smoke PRIVATE djayvo_core)
  add_test(NAME c_abi COMMAND djayvo_c_smoke "${CMAKE_CURRENT_BINARY_DIR}/c-api-input.wav" "${CMAKE_CURRENT_BINARY_DIR}/c-api-safe-render")
  find_package(Python3 3.9 COMPONENTS Interpreter)
  if(Python3_Interpreter_FOUND)
    add_test(NAME acoustic_assets COMMAND "${Python3_EXECUTABLE}"
      "${CMAKE_CURRENT_SOURCE_DIR}/scripts/verify_acoustic_assets.py")
    add_test(NAME sustained_assets COMMAND "${Python3_EXECUTABLE}"
      "${CMAKE_CURRENT_SOURCE_DIR}/scripts/verify_sustained_assets.py")
    add_test(NAME guitar_assets COMMAND "${Python3_EXECUTABLE}"
      "${CMAKE_CURRENT_SOURCE_DIR}/scripts/verify_guitar_assets.py")
    add_test(NAME electronic_assets COMMAND "${Python3_EXECUTABLE}"
      "${CMAKE_CURRENT_SOURCE_DIR}/scripts/verify_electronic_assets.py")
    add_test(NAME wav_integration COMMAND "${Python3_EXECUTABLE}"
      "${CMAKE_CURRENT_SOURCE_DIR}/tests/integration/verify_render.py"
      --renderer "$<TARGET_FILE:djayvo_render>"
      --output "${CMAKE_CURRENT_BINARY_DIR}/integration")
    add_test(NAME remix_integration COMMAND "${Python3_EXECUTABLE}"
      "${CMAKE_CURRENT_SOURCE_DIR}/tests/integration/verify_remix.py"
      --renderer "$<TARGET_FILE:djayvo_remix>"
      --output "${CMAKE_CURRENT_BINARY_DIR}/remix-integration")
    add_test(NAME word_timing COMMAND "${Python3_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/tests/integration/verify_word_timing.py")
    set_tests_properties(word_timing PROPERTIES WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}")
    add_test(NAME tooling COMMAND "${Python3_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/tests/integration/verify_tools.py")
    add_test(NAME listening_review COMMAND "${Python3_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/tests/integration/verify_listening_review.py")
    add_test(NAME evaluation_preparation COMMAND "${Python3_EXECUTABLE}"
      "${CMAKE_CURRENT_SOURCE_DIR}/tests/integration/verify_evaluation.py" --renderer "$<TARGET_FILE:djayvo_remix>")
    add_test(NAME plan_import COMMAND "${Python3_EXECUTABLE}"
      "${CMAKE_CURRENT_SOURCE_DIR}/tests/integration/verify_plan_import.py" --renderer "$<TARGET_FILE:djayvo_remix>")
  endif()
endif()
