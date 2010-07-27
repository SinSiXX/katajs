/*  KataJS
 *  GraphicsScript.js
 *
 *  Copyright (c) 2010, Daniel Reiter Horn
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

Kata.include("katajs/oh/impl/ScriptProtocol.js");
Kata.include("katajs/oh/Presence.js");
Kata.include("katajs/oh/RemotePresence.js");

(function() {
     var SUPER = Kata.Script.prototype;
     /** GraphicsScript is an extension of the core Script interface
      * which provides convenience methods for interacting with an
      * asynchronous rendering service.
      *
      * @constructor
      * @param channel channel for communication with main thread
      * @param args arguments provided by the creator of the object
      */
     Kata.GraphicsScript = function(channel, args) {
         SUPER.constructor.call(this, channel, args);
         /**
          *  @type {Array} Array of indexes into the mRemotePresences map that have a chance of being rendered
          *  conservative list: occasionally contains elements that no longer exist.
          */
         this.mRenderableRemotePresences=[];
         /**
          * Which index the render callback thread is investigating for object relevence
          * @type {number}
          */
         this.mRenderableRemotePresenceIndex=0;
         this.mGraphicsTimer=null;
         this.mNumGraphicsSystems=0;
     };
     Kata.extend(Kata.GraphicsScript, SUPER);
     /**
      * Enables graphics on the main canvas viewport. 
      * @param {Kata.Presence} presence The presence that graphics should be enabled for
      * @param {number} canvasId Optional canvas ID, which, if specified, indicates which canvas is the preferred attachment point. Otherwise it's first come, first serve for canvas 0 followed by canvas 1 (if present), etc
      */
     Kata.GraphicsScript.prototype.enableGraphicsViewport = function (presence,canvasId) {
         this._enableGraphics(presence,canvasId);
     };

     /**
      * Attach the current presence as a camera unit the specified texture. 
      * Also notify the graphics system of all current renderables.
      */
     Kata.GraphicsScript.prototype.enableGraphicsTexture = function (presence,textureObjectUUID,textureName, textureObjectSpace) {
         if (textureObjectSpace===undefined) {
             textureObjectSpace=presence.space();
         }
         this._enableGraphics(presence,undefined,textureObjectSpace, textureObjectUUID,textureName);
     };

     /**
      * Sends a remote presence to the graphics system to be considered for rendering
      * Marks the item as being on the graphics thread
      */
     Kata.GraphicsScript.prototype.renderRemotePresence = function(presence,remotePresence, noMesh) {
         //in our space, create
         var msg = new Kata.ScriptProtocol.FromScript.GFXCreateNode(presence.space(),presence.id(),remotePresence);
		 // FIXME FIXME FIXME random crap:
		 msg.orient = [0,0,0,1]
		 msg.rotaxis = [1,0,0]
		 msg.vel = [0,0,0]
		 msg.scale = [1,1,1]
		 if(noMesh) msg.scale = [0,0,0]
         this._sendHostedObjectMessage(msg);
         //in our space, add Mesh to the new graphics subsystem;
		 if (!noMesh) {
		 	var messages = Kata.ScriptProtocol.FromScript.generateGFXUpdateVisualMessages(presence.space(), presence.id(), remotePresence);
		 	var len = messages.length;
		 	for (var i = 0; i < len; ++i) {
		 		this._sendHostedObjectMessage(messages[i]);
		 	}
		 }
         remotePresence.inGFXSceneGraph = true;
         //FIXME: not sure what this line was trying to accomplishthis.appearanceRemotePresence(presence, remotePresence);
     };
     /**
      * Removess a remote presence to the graphics system from consideration for rendering
      * Marks the item as not being on the graphics thread
      */
     Kata.GraphicsScript.prototype.unrenderRemotePresence = function(presence,remotePresence) {
         var msg = new Kata.Script.GFXDestroyNode(presence.space(),presence.id(),remotePresence);
         this._sendHostedObjectMessage(msg);
         delete remotePresence.inGFXSceneGraph;
     };
     /**
      * Attach the current presence as a camera unit to either the canvasId or, if undefined, the specified texture. 
      * Also notify the graphics system of all current renderables.
      */
     Kata.GraphicsScript.prototype._enableGraphics = function (presence,canvasId,textureObjectSpace, textureObjectUUID,textureName) {
         var space=presence.space();
		 // don't give camera a mesh
         this.renderRemotePresence(presence,presence,true);
         for (var remotePresenceId in this.mRemotePresences) {
             var remotePresence=this.mRemotePresences[remotePresenceId];
             if (remotePresence.space()==space) { 
                 this.mRenderableRemotePresences[this.mRenderableRemotePresences.length]=remotePresenceId;
                 if (this.shouldRender(presence,remotePresence)&&!remotePresence.inGFXSceneGraph) {
                     this.renderRemotePresence(presence,remotePresence);
                 }
             }
         }
         var msg = new Kata.ScriptProtocol.FromScript.GFXAttachCamera(presence.space(),presence.id(),presence.id(),canvasId,textureObjectSpace,textureObjectUUID,textureName);
		 msg.msg = "Camera"
         this._sendHostedObjectMessage(msg);
         msg = new Kata.ScriptProtocol.FromScript.GFXAttachCamera(presence.space(),presence.id(),presence.id(),canvasId,textureObjectSpace,textureObjectUUID,textureName);
         this._sendHostedObjectMessage(msg);
         if (this.mNumGraphicsSystems++==0) {
             var duration=new Date(0);
             duration.setSeconds(2);
             this.mGraphicsTimer=this.timer(duration,Kata.bind(this.processRenderables,this),true);             
         }

     };

     /**
      * Goes through one remotePresence per timer call and checks whether it is renderable
      * If it should be, but it is not in the scene graph it marks it as renderable and adds to gfx thread
      * If it shouldn't be but is in the scene graph it marks it as unrenderable and removes from gfx thread
      * If it is no longer being shown by the cameras
      */
     Kata.GraphicsScript.prototype.processRenderables=function() {
         var len=this.mRenderableRemotePresences.length;
         if (len) {
             this.mRenderableRemotePresenceIndex%=len;             
             var remotePresenceName=this.mRenderableRemotePresences[this.mRenderableRemotePresenceIndex];
             var remotePresence=this.mRemotePresences[remotePresenceName];
             if (remotePresence) {
                 var presence = this.mPresences[remotePresence.space()];
                 var shouldRender=this.shouldRender(presence,remotePresence);
                 if (shouldRender) {
                     if (!remotePresence.inGFXSceneGraph)
                         this.renderRemotePresence(presence,remotePresence);
                 }else {
                     if (remotePresence.inGFXSceneGraph)
                         this.unrenderRemotePresence(presence,remotePresence);                     
                 }
                 this.mRenderableRemotePresenceIndex++;
             }else {
                 this.mRemotePresences[this.mRenderableRemotePresenceIndex]=this.mRemotePresences[len];
                 --this.mRemotePresences.length;//FIXME: does this clear the item itself
             }
         }
     };
     /**
      * Remove all renderables from the given presence from the render thread and unattach the camera
      */
     Kata.GraphicsScript.prototype.disableGraphics = function (presence) {
         {
             var msg = new Kata.ScriptProtocol.FromScript.GFXDetachCamera(presence.space(),presence.id(),presence.id());
             this._sendHostedObjectMessage(msg);
    
         }
         var space=presence.space();
         var len = this.mRenderableRemotePresences.length;
         var msg = unrenderRemotePresence(presence,presence);
         this._sendHostedObjectMessage(msg);
         for (var i=0;i<len;) {
             var remotePresence=this.mRemotePresences[this.mRenderableRemotePresences[i]];
             if (remotePresence && remotePresence.space()==space) {
                 if (remotePresence.inGFXSceneGraph) {
                     //in our space, add to the new graphics subsystem;
                     this.unrenderRemotePresence(presence,remotePresence);
                 }
                 this.mRenderableRemotePresences[i]=this.mRenderableRemotePresences[len];
                 len=--this.mRenderableRemotePresences.length;                 
             }else {
                 ++i;
             }
         }
         if (--this.mNumGraphicsSystems==0){
             this.mGraphicsTimer.disable();
             this.mGraphicsTimer=null;
         }
     };
     /**
      *
      */
     Kata.GraphicsScript.prototype._handleQueryEvent=function(channel,data) {
         var remotePresence=SUPER._handleQueryEvent.call(this,channel,data);
         if (remotePresence) {
             var presence=this.mPresences[data.space];
             if (presence.inGFXSceneGraph) {//if this particular presence has gfx enabled
                 if (data.entered) {
                     this.mRenderableRemotePresences.push(remotePresence);
                     if (this.shouldRender(presence,remotePresence)) {
                         this.renderRemotePresence(presence,remotePresence);
                     }
                 }else {
                     if (remotePresence.inGFXSceneGraph) {
                         this.unrenderRemotePresence(presence,remotePresence);
                     }
                 }
             }
         }
         this.processRenderables();//garbage collect dead renderables;
         return remotePresence;
     };
     /**
      * Override Script._handlePresenceLocUpdate
      */
     Kata.GraphicsScript.prototype._handlePresenceLocUpdate = function(channel, data){
         var remotePresence = SUPER._handlePresenceLocUpdate.call(this, channel, data);
         if (remotePresence) {
             var presence = this.mPresences[data.space];
             if (presence.inGFXSceneGraph) {//if this particular presence has gfx enabled
                 var msg = new Kata.ScriptProtocol.FromScript.GraphicsMessage(this.mPresence.space(), this.mPresence.id(), remotePresence.id());
                 msg.msg = "Move"
                 msg.pos = data.loc.pos;
                 msg.orient = data.loc.orient;
                 msg.vel = data.loc.vel;
                 msg.angvel = data.loc.rotvel;
                 msg.rotaxis = data.loc.rotaxis;
                 // FIXME: acceleration, other things??
                 this._sendHostedObjectMessage(msg)
             }
         }
         return remotePresence;
     }
     /**
      * Overridable function that indicates whether a given remotePresence 
      * should be rendered for the given presence.
      */
     Kata.GraphicsScript.prototype.shouldRender = function(presence,remotePresence) {
         return true;
     };
     
 })();
