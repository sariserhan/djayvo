cmake_minimum_required(VERSION 3.20)
project(Jamloom VERSION 0.2.0 LANGUAGES C CXX)

# Existing sanitizer build directories must not silently lose instrumentation.
if(DEFINED DJAYVO_SANITIZERS AND NOT DEFINED JAMLOOM_SANITIZERS)
  set(JAMLOOM_SANITIZERS "${DJAYVO_SANITIZERS}" CACHE BOOL "Enable address and undefined-behavior sanitizers")
endif()
option(JAMLOOM_SANITIZERS "Enable address and undefined-behavior sanitizers" OFF)
include(CTest)

add_library(jamloom_core STATIC
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
target_include_directories(jamloom_core PUBLIC core/include)
target_compile_features(jamloom_core PUBLIC cxx_std_17)
set_target_properties(jamloom_core PROPERTIES CXX_EXTENSIONS OFF POSITION_INDEPENDENT_CODE ON)
if(MSVC)
  target_compile_options(jamloom_core PRIVATE /W4 /fp:precise)
else()
  target_compile_options(jamloom_core PRIVATE -Wall -Wextra -Wpedantic -Wconversion -Wshadow -fno-fast-math)
endif()
if(JAMLOOM_SANITIZERS)
  if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(jamloom_core PUBLIC -fsanitize=address,undefined -fno-omit-frame-pointer)
    target_link_options(jamloom_core PUBLIC -fsanitize=address,undefined)
  else()
    message(FATAL_ERROR "JAMLOOM_SANITIZERS requires GCC or Clang")
  endif()
endif()

add_executable(jamloom_render tools/cli/main.cpp)
target_link_libraries(jamloom_render PRIVATE jamloom_core)
add_executable(jamloom_remix tools/cli/remix_main.cpp tools/cli/plan_import.cpp)
target_link_libraries(jamloom_remix PRIVATE jamloom_core)

if(EMSCRIPTEN)
  # Browser isolation replaces filesystem publication; the shared DSP is unchanged.
  target_compile_options(jamloom_core PRIVATE -fexceptions)
  add_executable(jamloom_web apps/web/bridge.cpp)
  target_link_libraries(jamloom_web PRIVATE jamloom_core)
  target_compile_options(jamloom_web PRIVATE -fexceptions)
  target_link_options(jamloom_web PRIVATE
    -fexceptions --no-entry
    "-sEXPORTED_FUNCTIONS=['_jamloom_web_render','_jamloom_web_session','_jamloom_web_session_mode']"
    "-sEXPORTED_RUNTIME_METHODS=['ccall','FS']"
    -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker,node
    -sALLOW_MEMORY_GROWTH=1 -sMAXIMUM_MEMORY=536870912 -sSTACK_SIZE=2097152)
  set_target_properties(jamloom_web PROPERTIES SUFFIX ".mjs")
  add_executable(jamloom_live core/audio/live.cpp)
  target_link_libraries(jamloom_live PRIVATE jamloom_core)
  target_link_options(jamloom_live PRIVATE --no-entry
    "-sEXPORTED_FUNCTIONS=['_jamloom_live_init','_jamloom_live_note','_jamloom_live_off','_jamloom_live_panic','_jamloom_live_buffer','_jamloom_live_render','_jamloom_live_active','_jamloom_live_mouth','_jamloom_next_bar']"
    -sSTANDALONE_WASM=1 -sFILESYSTEM=0 -sALLOW_MEMORY_GROWTH=0
    -sINITIAL_MEMORY=33554432 -sSTACK_SIZE=262144)
  set_target_properties(jamloom_live PROPERTIES SUFFIX ".wasm")
endif()

if(BUILD_TESTING)
  add_executable(jamloom_session_render core/tests/session_render.cpp)
  target_link_libraries(jamloom_session_render PRIVATE jamloom_core)
  add_executable(jamloom_live_tests core/tests/live_tests.cpp)
  target_link_libraries(jamloom_live_tests PRIVATE jamloom_core)
  add_test(NAME live_instruments COMMAND jamloom_live_tests)
  add_executable(jamloom_tests core/tests/tests.cpp)
  target_link_libraries(jamloom_tests PRIVATE jamloom_core)
  add_test(NAME core COMMAND jamloom_tests)
  add_executable(jamloom_remix_tests core/tests/remix_tests.cpp)
  target_link_libraries(jamloom_remix_tests PRIVATE jamloom_core)
  add_test(NAME remix_core COMMAND jamloom_remix_tests)
  add_executable(jamloom_c_smoke core/tests/c_api_smoke.c)
  target_link_libraries(jamloom_c_smoke PRIVATE jamloom_core)
  add_test(NAME c_abi COMMAND jamloom_c_smoke "${CMAKE_CURRENT_BINARY_DIR}/c-api-input.wav" "${CMAKE_CURRENT_BINARY_DIR}/c-api-safe-render")
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
      --renderer "$<TARGET_FILE:jamloom_render>"
      --output "${CMAKE_CURRENT_BINARY_DIR}/integration")
    add_test(NAME remix_integration COMMAND "${Python3_EXECUTABLE}"
      "${CMAKE_CURRENT_SOURCE_DIR}/tests/integration/verify_remix.py"
      --renderer "$<TARGET_FILE:jamloom_remix>"
      --output "${CMAKE_CURRENT_BINARY_DIR}/remix-integration")
    add_test(NAME word_timing COMMAND "${Python3_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/tests/integration/verify_word_timing.py")
    set_tests_properties(word_timing PROPERTIES WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}")
    add_test(NAME tooling COMMAND "${Python3_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/tests/integration/verify_tools.py")
    add_test(NAME listening_review COMMAND "${Python3_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/tests/integration/verify_listening_review.py")
    add_test(NAME evaluation_preparation COMMAND "${Python3_EXECUTABLE}"
      "${CMAKE_CURRENT_SOURCE_DIR}/tests/integration/verify_evaluation.py" --renderer "$<TARGET_FILE:jamloom_remix>")
    add_test(NAME plan_import COMMAND "${Python3_EXECUTABLE}"
      "${CMAKE_CURRENT_SOURCE_DIR}/tests/integration/verify_plan_import.py" --renderer "$<TARGET_FILE:jamloom_remix>")
  endif()
endif()
