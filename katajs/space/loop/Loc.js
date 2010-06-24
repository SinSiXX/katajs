/*  KataJS
 *  Loc.js
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

(function() {

     if (typeof(Kata.Loopback) == "undefined") { Kata.Loopback = {}; }

     Kata.Loopback.Loc = function() {
         this.mObjects = {};
         this.mListeners = [];
     };

     // Listeners should be callable as listener(uuid, pos, vel, acc,
     // bounds), where some may be undefined
     Kata.Loopback.Loc.prototype.addListener = function(listener) {
         this.mListeners.append(listener);
     };

     Kata.Loopback.Loc.prototype._notify = function() {
         for(listener in this.mListeners) {
             listener.apply(undefined, arguments);
         }
     };

     Kata.Loopback.Loc.prototype.add = function(uuid, pos, vel, acc, bounds) {
         if (this.mObjects[uuid])
             Kata.warn("Loopback.Loc trying to remove unknown object." + uuid);

         this.mObjects[uuid] = {
             pos : pos,
             vel : vel,
             acc : acc,
             bounds : bounds
         };
     };

     Kata.Loopback.Loc.prototype._checkExists = function(uuid) {
         if (!this.mObjects[uuid]) {
             Kata.warn("Loopback.Loc trying to remove unknown object." + uuid);
             return false;
         }
         return true;
     };

     Kata.Loopback.Loc.prototype.remove = function(uuid) {
         if (!this._checkExists()) return;
         delete this.mObjects[uuid];
     };

     Kata.Loopback.Loc.prototype.update = function(uuid, pos, vel, acc, bounds) {
         if (!this._checkExists()) return;
         if (pos) this.mObjects[uuid].pos = pos;
         if (vel) this.mObjects[uuid].vel = vel;
         if (acc) this.mObjects[uuid].acc = acc;
         if (bounds) this.mObjects[uuid].bounds = bounds;
         this._notify(uuid, pos, vel, acc, bounds);
     };

     Kata.Loopback.Loc.prototype.updatePosition = function(uuid, pos) {
         this.update(uuid, pos, undefined, undefined, undefined);
     };

     Kata.Loopback.Loc.prototype.updateVelocity = function(uuid, vel) {
         this.update(uuid, undefined, vel, undefined, undefined);
     };

     Kata.Loopback.Loc.prototype.updateAcceleration = function(uuid, acc) {
         this.update(uuid, undefined, undefined, acc, undefined);
     };

     Kata.Loopback.Loc.prototype.updateBounds = function(uuid, bounds) {
         this.update(uuid, undefined, undefined, undefined, bounds);
     };

})();