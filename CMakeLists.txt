cmake_minimum_required(VERSION 3.20)
project(Djayvo VERSION 0.1.0 LANGUAGES CXX)

option(DJAYVO_SANITIZERS "Enable address and undefined-behavior sanitizers" OFF)
include(CTest)

add_library(djayvo_core STATIC
  core/composition/plan.cpp
  core/arrangement/demo.cpp
  core/instruments/voice.cpp
  core/audio/renderer.cpp
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

if(BUILD_TESTING)
  add_executable(djayvo_tests core/tests/tests.cpp)
  target_link_libraries(djayvo_tests PRIVATE djayvo_core)
  add_test(NAME core COMMAND djayvo_tests)
  find_package(Python3 3.9 COMPONENTS Interpreter)
  if(Python3_Interpreter_FOUND)
    add_test(NAME wav_integration COMMAND "${Python3_EXECUTABLE}"
      "${CMAKE_CURRENT_SOURCE_DIR}/tests/integration/verify_render.py"
      --renderer "$<TARGET_FILE:djayvo_render>"
      --output "${CMAKE_CURRENT_BINARY_DIR}/integration")
  endif()
endif()
