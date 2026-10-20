#include "jamloom/session.h"
extern "C" double jamloom_next_bar(double earliest, double origin, unsigned rate, unsigned tempo) {
    return jamloom::next_bar_frame(earliest,origin,rate,tempo);
}
