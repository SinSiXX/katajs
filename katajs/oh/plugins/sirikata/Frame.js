/*  KataJS
 *  Frame.js
 *
 *  Copyright (c) 2010, Ewen Cheslack-Postava
 *  All rights reserved.
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are
 *  met:
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the
 *    distribution.
 *  * Neither the name of Sirikata nor the names of its contributors may
 *    be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER
 * OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";

(function() {

    /** Kata.Frame provides simple framing because protocol buffers /
     * PBJ doesn't provide any built-in framing.  The format is a
     * simple 32-bit, network-order length followed by the data.  This
     * just provides a few serialization/deserialization methods which
     * ensure proper encoding an can handle checking for full
     * messages.
     **/
    Kata.Frame = {};

    /** Try to parse a frame. If a full frame is available, return it
     * and modify the input array so the frame is removed. If not
     * available, null is returned and the input data array remains
     * unchanged.
     */
    Kata.Frame.parse = function(data) {
        // We need at least the length
        if (data.length < 4) return null;

        // Extract the length and check if we have everything
        var len =
            data[0] * 16777216 +
            data[1] * 65536 +
            data[2] * 256 +
            data[3];
        if (data.length < (4+len)) return null;

        // If we got here, we have enough data. Remove the length.
        data.splice(0, 4);
        // And remove the data, returning it
        return data.splice(0, len);
    };

})();