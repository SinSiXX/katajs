/*  Kata Javascript Network Layer
 *  HostedObject.js
 *
 *  Copyright (c) 2010, Patrick Reiter Horn
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

Kata.include("katajs/oh/ObjectHost.js");
Kata.include("katajs/oh/impl/ScriptProtocol.js");
Kata.include("katajs/core/MessageDispatcher.js");

(function() {

    /** Base class for protocol-specific HostedObject implementations.
     * @constructor
     * @param {Kata.ObjectHost} objectHost Pointer to controlling object host.
     * @param {string} id Some identifier for this object. It may not be
     *     meaningful to the underlying protocol?
     */
    Kata.HostedObject = function (objectHost, id) {
        this.mObjectHost = objectHost;
        this.mID = id;

        this.mScriptChannel = null;

        var scriptHandlers = {};
        var scriptTypes = Kata.ScriptProtocol.FromScript.Types;
        scriptHandlers[scriptTypes.Connect] = Kata.bind(this._handleConnect, this);
        scriptHandlers[scriptTypes.Disconnect] = Kata.bind(this._handleDisconnect, this);
        scriptHandlers[scriptTypes.Query] = Kata.bind(this._handleQuery, this);
        scriptHandlers[scriptTypes.Location] = Kata.bind(this._handleLocUpdateRequest, this);
        scriptHandlers[scriptTypes.Subscription] = Kata.bind(this._handleSubscriptionRequest, this);

        scriptHandlers[scriptTypes.CreateObject] = Kata.bind(this._handleCreateObject, this);
        scriptHandlers[scriptTypes.GraphicsMessage] = Kata.bind(this._handleGraphicsMessage, this);

        this.mScriptMessageDispatcher = new Kata.MessageDispatcher(scriptHandlers);
    };

    /**
     * @return Pointer to controlling object host as passed in constructor.
     */
    Kata.HostedObject.prototype.getObjectHost = function () {
        return this.mObjectHost;
    };

    /**
     * @return Pointer to identifier passed in constructor.
     */
    Kata.HostedObject.prototype.getID = function () {
        return this.mID;
    };

     Kata.HostedObject.prototype.sendScriptMessage = function(msg) {
         if (!this.mScriptChannel) {
             Kata.warn("Couldn't send script message: no script.");
             return;
         }

         this.mScriptChannel.sendMessage(msg);
     };

     Kata.HostedObject.prototype.messageFromScript = function (channel, data) {
         this.mScriptMessageDispatcher.dispatch(channel, data);
     };

     Kata.HostedObject.prototype._handleConnect = function (channel, request) {
         this.mObjectHost.connect(this, request.space, request.auth);
     };

     Kata.HostedObject.prototype.connectionResponse = function(success, presence_id, loc, bounds, visual) {
         var msg = null;
         if (success)
             msg = new Kata.ScriptProtocol.ToScript.Connected(presence_id.space, presence_id.object, loc, bounds, visual);
         else
             msg = new Kata.ScriptProtocol.ToScript.ConnectionFailed(presence_id.space, presence_id.object);
         this.sendScriptMessage(msg);
     };

     Kata.HostedObject.prototype._handleDisconnect = function (channel, request) {
         Kata.warn("Disconnect request.");
     };

     Kata.HostedObject.prototype._handleQuery = function (channel, request) {
         this.mObjectHost.registerProxQuery(request.space, request.id, request.sa);
     };

     Kata.HostedObject.prototype.proxEvent = function(space, observed, entered, properties) {
         var msg = new Kata.ScriptProtocol.ToScript.QueryEvent(space, observed, entered, properties.loc, properties.bounds, properties.visual);
         this.sendScriptMessage(msg);
     };

     Kata.HostedObject.prototype._handleCreateObject = function (channel, request) {
         this.mObjectHost.createObject(request.script, request.constructor, request.args);
     };

     Kata.HostedObject.prototype._handleLocUpdateRequest = function (channel, request) {
         this.mObjectHost.locUpdateRequest(
             request.space,
             request.id,
             request.position,
             request.velocity,
             request.acceleration,
             request.bounds,
             request.visual
         );
     };

     Kata.HostedObject.prototype._handleGraphicsMessage = function (channel, request) {
         this.mObjectHost.sendGraphicsMessage(request);
     };

     Kata.HostedObject.prototype._handleSubscriptionRequest = function (channel, request) {
         if (request.enable)
             this.mObjectHost.subscribe(request.space, request.id, request.observed);
         else
             this.mObjectHost.unsubscribe(request.space, request.id, request.observed);
     };

    /** A simulation sent a message to this object via the object host.
     *
     * @param {Kata.Channel} channel  Channel of the sending simulation.
     * @param {object} data  Data from the simulation (at the moment, in
     *     JavascriptGraphicsApi format, as well as protocol-specific messages)
     */
    Kata.HostedObject.prototype.messageFromSimulation = function (channel, data) {
    };

     Kata.HostedObject.prototype.createScript = function(script, method, args) {
         var script_worker = new Kata.WebWorker(
             "katajs/oh/impl/BootstrapScript.js",
             "Kata.BootstrapScript",
             {
                 realScript: script,
                 realClass: method,
                 realArgs: args
             }
         );
         this.mScriptChannel = script_worker.getChannel();
         this.mScriptChannel.registerListener(
             Kata.bind(this.messageFromScript,this));
         script_worker.go();
     };
})();
