#include "djayvo/session.h"
extern "C" double djayvo_next_bar(double earliest, double origin, unsigned rate, unsigned tempo) {
    return djayvo::next_bar_frame(earliest,origin,rate,tempo);
}
