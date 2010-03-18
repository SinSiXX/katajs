/*  Kata Javascript Network Layer
 *  SirikataHostedObject.js
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

if (typeof Sirikata == "undefined") { Sirikata = {}; }

(function() {

    var Ports = {
        RPC:0, // Default MessageBody RPC service
        REGISTRATION:1,
        LOC:2,
        GEOM:3, // Proximity service: Also known as PROX
        ROUTER:4,
        PERSISTENCE:5,
        PHYSICS:6,
        TIMESYNC:7,
        SUBSCRIPTION:9,
        BROADCAST:10
    };

    var MIN_TTL = 1; // subscription messages.
    var SPACE_OBJECT = "";

    function sendPersistenceMessage(querytracker, message, callback) {
        var sentBody = message.body();
        message.setCallback(function(respHeader, respBytes) {
            var respBody = new Sirikata.Persistence.Protocol.ReadWriteSet;
            respBody.ParseFromStream(new PROTO.Base64Stream(respBytes));
            var index = 0;
            //console.log("Got persistence message: "+respBody.reads.length,respBody);
            for (var i = 0; i < respBody.reads.length; i++) {
                if (respBody.reads[i].index !== undefined) {
                    index = respBody.reads[i].index;
                }
                if (index < sentBody.reads.length && index >= 0) {
                    if (respBody.reads[i].return_status !== undefined) {
                        sentBody.reads[index].return_status =
                            respBody.reads[i].return_status;
                    } else if (respBody.reads[i].data !== undefined) {
                        sentBody.reads[index].data = respBody.reads[i].data;
                        if (respBody.reads[i].subscription_id !== undefined) {
                            sentBody.reads[index].subscription_id =
                                respBody.reads[i].subscription_id;
                            sentBody.reads[index].ttl = respBody.reads[i].ttl;
                        }
                    } else {
                        console.log("Error: missing return_status in message!");
                    }
                }
                index++;
            }
            //console.log("Checking persistence message: "+sentBody.reads.length,sentBody);
            for (var i = 0; i < sentBody.reads.length; i++) {
                if (sentBody.reads[i].return_status === undefined &&
                    sentBody.reads[i].data === undefined) {
                    //console.log("Persistence reads missing: "+i);
                    //return true;
                }
            }
            callback();
            return false;
        });
        querytracker.send(message);
    }

    Sirikata.ProxyObject = function(service, objectHost, space, id) {
        this.mObjectHost = objectHost;
        this.mRequests = {};
        this.mSubscriptions = [];
        this.mRefCount = 0;
        this.mID = id;
        this.mSpace = space;
        this.mLocationPendingRequests=[]
        this.mQueryTracker = new Sirikata.QueryTracker(service.newPort());


    };

    Sirikata.ProxyObject.prototype.destroy = function() {
        for (var propname in this.subscriptions) {
            var subinfo = this.subscriptions[propname];
            var subMsg = new Sirikata.Protocol.Subscribe;
            subMsg.object = this.mID;
            subMsg.broadcast_name = subscription.subid;
            // ommitted ttl = unsubscribe.
            var header = new Sirikata.Protocol.Header;
            header.destination_object = SPACE_OBJECT;
            header.destination_port = Ports.SUBSCRIPTION;
            var message = new Sirikata.QueryTracker.Message(header, msg);
            this.mQueryTracker.send(message);
            delete this.mQueryTracker;
            if (this.mLocationPendingRequests===undefined) {
                thus.mObjectHost.sendToSimulation({msg:"Destroy",
                                                   id:this.mID
                                                   });
            }
            this.mDestroyed=true;
        }
    };
    Sirikata.ProxyObject.prototype.generateMessage = function(portnum,msg) {
        var header = new Sirikata.Protocol.Header;
        header.destination_object = this.mID;
        //header.destination_space = this.mSpace;
        header.destination_port = portnum;
        return new Sirikata.QueryTracker.Message(header, msg);
    };
    Sirikata.ProxyObject.prototype.subscribeToProperty = function(propname, subid, ttl) {
        if (!ttl || ttl < MIN_TTL) {
            ttl = MIN_TTL;
        }
        var subMsg = new Sirikata.Protocol.Subscribe;
        subMsg.object = this.mID;
        subMsg.broadcast_name = subid;
        subMsg.update_period = ttl;
        var header = new Sirikata.Protocol.Header;
        header.destination_object = SPACE_OBJECT;
        header.destination_port = Ports.SUBSCRIPTION;
        var message = new Sirikata.QueryTracker.Message(header, msg);
        this.mQueryTracker.send(message);
    };
    Sirikata.ProxyObject.prototype.setLightProperty = function(lightProp) {
       this.mObjectHost.sendToSimulation({msg:"Light",
                                          id:this.mID,
                                          diffuse_color:lightProp.diffuse_color,
                                          specular_color:lightProp.specular_color,
                                          ambient_color:lightProp.ambient_color,
                                          power:lightProp.power
                                            });
    }
    Sirikata.ProxyObject.prototype.askForProperties = function() {
        var sentBody = new Sirikata.Persistence.Protocol.ReadWriteSet;
        // check that MeshScale is capped at the object's bounding sphere.
        sentBody.reads.push().field_name = "MeshScale";
        sentBody.reads.push().field_name = "MeshURI";
        sentBody.reads.push().field_name = "WebViewURL";
        sentBody.reads.push().field_name = "LightInfo";
        sentBody.reads.push().field_name = "PhysicalParameters";
        sentBody.reads.push().field_name = "Parent";
        sentBody.reads.push().field_name = "Name";
        // Ports.LOC
        var message = this.generateMessage(Ports.PERSISTENCE, sentBody);
        var thus = this;
        sendPersistenceMessage(this.mQueryTracker, message, function() {
            var deferUntilPositionResponse=function() {
                var fields = {};
                for (var i = 0; i < sentBody.reads.length; i++) {
                    var read = sentBody.reads[i];
                    if (read.return_status === undefined && read.data !== undefined) {
                        var propname = read.field_name;
                        var propval = {data: read.data,
                             ttl: read.ttl,
                             subid: read.subscription_id};
                        fields[propname] = propval;
                        if (propval.subid !== undefined) {
                            thus.subscribeToProperty(propname, propval.subid, propval.ttl);
                        }
                    }
                }
                var type = 'node';
                var isWebView = false;
                if (fields["MeshURI"]) {//these are data coming from the network in PBJ string form, not fields in a js struct
                    type = 'mesh';
                } else if (fields["LightInfo"]) {
                    type = 'light';
                }
                if (fields["WebViewURL"]) {
                    isWebView = true;
                }
                if (isWebView) { // && type != 'mesh'
                    type = 'webview';
                }
                switch (type) {
                case 'mesh':{
                    var meshURI=new Sirikata.Protocol.StringProperty;
                    meshURI.ParseFromStream(new PROTO.ByteArrayStream(fields["MeshURI"].data));
                   //FIXME: test for parse failure
                   if (meshURI.value===undefined) {
                       console.log("Property parse failure",fields["MeshURI"].data);
                   }else {
                   //send item to graphics system
                       thus.mObjectHost.sendToSimulation({msg:"Mesh",
                                                      id:thus.mID,
                                                      mesh:meshURI.value
                                                      });
                   }
                   }break;
                case 'light':{
                    lightProp=new Sirikata.Protocol.LightInfoProperty;
                    lightProp.ParseFromStream(new PROTO.ByteArrayStream(fields["LightInfo"].data));
                    thus.setLightProperty(lightProp);
                }break;
                default:break;
                }
            };
            if (thus.mLocationPendingRequests!==undefined) {
                thus.mLocationPendingRequests.push(deferUntilPositionResponse);
            }else {
                deferUntilPositionResponse();
            }

        });
    };
    Sirikata.ProxyObject.prototype.askForPosition = function() {
        var loc = new Sirikata.Protocol.LocRequest;
        var object_reference=this.mID;
        loc.object=object_reference;
        var msg = new Sirikata.Protocol.MessageBody;
        msg.message_names.push("LocRequest");
        msg.message_arguments.push(loc);
        var header = new Sirikata.Protocol.Header;
        header.destination_object = object_reference; //SPACE_OBJECT;
        header.destination_port = Ports.RPC; //Ports.LOC;
        var message = new Sirikata.QueryTracker.Message(header, msg);
        var thus=this;
        message.setCallback(function(respHeader, respBody) {
            if (!this.mDestroyed) {
                // FIXME: Error checking
                var msgBody = new Sirikata.Protocol.MessageBody;
                msgBody.ParseFromStream(new PROTO.Base64Stream(respBody));
                var objLoc=new Sirikata.Protocol.ObjLoc;
                objLoc.ParseFromStream(new PROTO.ByteArrayStream(msgBody.message_arguments[0]));
                thus.mObjectHost.sendToSimulation({
                    msg: "Create",
                    id: object_reference,//private ID for gfx (we can narrow it)
                    time:objLoc.timestamp,
                    pos:objLoc.position,
                    vel:objLoc.velocity,
                    rotaxis:objLoc.rotational_axis,
                    rotvel:objLoc.angular_speed
                    });
                var deferredLength=thus.mLocationPendingRequests.length;
                for (var index=0;index<deferredLength;index+=1) {
                    thus.mLocationPendingRequests[index]();
                }
                delete thus.mLocationPendingRequests;
                if (objLoc.subscription_id!==undefined) {
                   thus.subscribeToProperty("ObjLoc", objLoc.subscription_id, respBody.ttl);
                }
            }
        });
        this.mQueryTracker.send(message);
    };

    // public class SirikataHostedObject
    var SUPER = Kata.HostedObject.prototype;

    /** @constructor */
    Sirikata.HostedObject = function (objectHost, uuid, createMsg) {
        SUPER.constructor.call(this, objectHost, uuid);
        this.mSpaceConnectionMap = {};
        this.mObjects = {};
        this.mProperties = {};
        this.mScale = [1,1,1];
        this.mPosition = [0,0,0];
        this.mOrientation = [0,0,0,1];
        this.mVelocity = [0,0,0];
        this.mRotAxis = [0,0,1];
        this.mRotSpeed = 0;
        this.mParentObject = null;
        this.mBoundingSphere = 0;
        this._parseMoveMessage(createMsg, true);
    };

    Kata.extend(Sirikata.HostedObject, SUPER);

    Sirikata.HostedObject.prototype._parseMoveMessage = function(msg, initialization) {
        if (msg.scale) {
            var meshScale = new Sirikata.Protocol.Vector3fProperty;
            var scaleX = msg.scale[0], scaleY = msg.scale[1], scaleZ = msg.scale[2];
            meshScale.value.push(scaleX);
            meshScale.value.push(scaleY);
            meshScale.value.push(scaleZ);
            this.setProperty("MeshScale", meshScale);
            if (initialization) {
                this.mBoundingSphere = Math.sqrt(scaleX*scaleX+scaleY*scaleY+scaleZ*scaleZ);
            }
        }
        if (msg.pos) {
            this.mPosition = msg.pos;
        }
        if (msg.vel) {
            this.mVelocity = msg.vel;
        }
        if (msg.orient) {
            this.mOrientation = msg.orient;
        }
        if (msg.rotvel) {
            this.mRotSpeed = msg.rotvel;
        }
        if (msg.rotaxis) {
            this.mRotAxis = msg.rotaxis;
        } else if (initialization) {
            this.mRotSpeed = 0;
        }
        if (msg.parent) {
            this.mParentObject = msg.parent;
            if (msg.parent != null) {
                var parentProp = new Sirikata.Protocol.ParentProperty;
                parentProp.value = msg.parent;
                this.setProperty("Parent", msg.parent);
            } else {
                this.unsetProperty("Parent");
            }
        }
		if (msg.msg != "Create") {
			this.mObjectHost.sendToSimulation(msg);
		}
        // attachment_point or parentbone not implemented
    }
    Sirikata.HostedObject.prototype.setProperty = function(propname, propval) {
        var byteArrStream = new PROTO.ByteArrayStream;
        propval.SerializeToStream(byteArrStream);
        this.mProperties[propname] = byteArrStream.getArray();
    }
    Sirikata.HostedObject.prototype.unsetProperty = function(propname) {
        delete this.mProperties[propname];
    }

    Sirikata.HostedObject.prototype._fillObjLoc = function(loc) {
        // Takes ObjLoc message and fills out fields.
        loc.timestamp = PROTO.I64.fromNumber(new Date().getTime()*1000);
        loc.position = this.mPosition;
        loc.orientation = this.mOrientation;
        loc.velocity = this.mVelocity;
        loc.angular_velocity = this.mRotVel;
        loc.angular_speed = this.mRotSpeed;
    }

    Sirikata.HostedObject.prototype.connectToSpace = function (space) {
        var topLevelConnection = this.mObjectHost.connectToSpace(space);
        var substream = topLevelConnection.clone();
        var spaceconn = {
            objectID: null,
            proximity: {},
            service: null,
            rpcPort: null,
            queryTracker: null
        };
        this.mSpaceConnectionMap[space] = spaceconn;
        spaceconn.service = new Sirikata.SstService(substream, space);
        spaceconn.queryTracker = new Sirikata.QueryTracker(spaceconn.service.newPort());
        spaceconn.rpcPort = spaceconn.service.getPort(Ports.RPC);
        spaceconn.service.getPort(Ports.RPC).addReceiver(
            Kata.bind(this._parseRPC, this));
        spaceconn.service.getPort(Ports.PERSISTENCE).addReceiver(
            Kata.bind(this._parsePersistence, this));
        spaceconn.service.getPort(Ports.BROADCAST).addReceiver(
            Kata.bind(this._parseBroadcast, this));

        // send introductory NewObj message.
        {
            var body = new Sirikata.Protocol.MessageBody;
            body.message_names.push("NewObj");
            var newObj = new Sirikata.Protocol.NewObj;
            newObj.object_uuid_evidence = this.mID;
            newObj.bounding_sphere = [0,0,0,this.mBoundingSphere];
            this._fillObjLoc(newObj.requested_object_loc);
            body.message_arguments.push(newObj);
            var header = new Sirikata.Protocol.Header;
            header.destination_port = Ports.REGISTRATION;
            header.destination_object = "";
            spaceconn.rpcPort.send(header,body);
        }
        return substream;
    };

    Sirikata.HostedObject.prototype._parseRPC = function (header, bodydata) {
        var body = new Sirikata.Protocol.MessageBody;
        body.ParseFromStream(new PROTO.Base64Stream(bodydata));
        console.log("Received RPC from:",header,"Body:",body);
        var spaceConn = this.mSpaceConnectionMap[header.source_space];
        var message_name = '';
        var message = null;
        var outMsg = new Sirikata.Protocol.MessageBody;
        var sendReply = false;
        for (var i = 0; i < body.message_arguments.length; i++) {
            var addReply = false;
            if (body.message_names[i]) {
                message_name = body.message_names[i];
            }
            message = body.message_arguments[i];
            switch (message_name) {
            case "LocRequest":
                var objLoc = new Sirikata.Protocol.ObjLoc;
                this._fillObjLoc(objLoc);
                outMsg.message_arguments.push(objLoc)
                sendReply = addReply = true;
                break;
            case "RetObj":
                var retObj = new Sirikata.Protocol.RetObj;
                retObj.ParseFromStream(new PROTO.ByteArrayStream(message));
                console.log("Got RetObj!", retObj);
                console.log("Object "+this.mID+" maps to "+retObj.object_reference);
                spaceConn.objectID = retObj.object_reference;
                spaceConn.service.setObjectReference(spaceConn.objectID);
                this.mObjectHost.sendToSimulation({
                    msg: "Create",
                    id: this.mID,//private ID for gfx (we can narrow it)
                    time:retObj.location.timestamp,
                    pos:retObj.location.position,
                    vel:retObj.location.velocity,
                    rotaxis:retObj.location.rotational_axis,
                    rotvel:retObj.location.angular_speed
                });
                // FIXME: Send my own type, in addition to the "Create" message!!!
                for (var queryid in spaceConn.proximity) {
                    this._sendNewProxQuery(spaceConn.proximity[queryid]);
                }
                break;
            case "ProxCall":
                var proxCall = new Sirikata.Protocol.ProxCall;
                proxCall.ParseFromStream(new PROTO.ByteArrayStream(message));
                var proximate_object = proxCall.proximate_object;
                if (proximate_object == spaceConn.objectID) {
                    //FIXME: Maybe also check for other objects on this same ObjectHost?
                } else if (proxCall.proximity_event == Sirikata.Protocol.ProxCall.ProximityEvent.ENTERED_PROXIMITY) {
                    var obj = this.mObjects[proximate_object];
                    if (!obj) {
                        obj = new Sirikata.ProxyObject(spaceConn.service, this.mObjectHost, header.source_space, proximate_object);
                        obj.askForProperties();
                        obj.askForPosition();
                    }
                    obj.mRefCount++; // in case this object has multiple queries.
                    console.log("Entered:",proxCall.proximate_object);
                } else {
                    var obj = this.mObjects[proximate_object];
                    if (obj) {
                        if(--obj.mRefCount==0) {
                            obj.destroy();
                            delete this.mObjects[proximate_object];
                        }
                    }
                    console.log("Exited:",proxCall.proximate_object);
                }
                break;
            }
            if (!addReply) {
                outMsg.message_arguments.push([]);
            }
        }
        if (sendReply && header.id !== undefined) {
            header.reply_id = header.id;
            header.destination_object = header.source_object;
            header.destination_port = header.source_port;
            header.id = undefined;
            header.source_port = undefined;
            header.source_object = undefined;
            this.mSpaceConnectionMap[header.source_space].service.getPort(Ports.RPC)
                .send(header, outMsg);
        }
    };
    Sirikata.HostedObject.prototype._parsePersistence = function (header, bodydata) {
        var body = new Sirikata.Persistence.Protocol.ReadWriteSet;
        body.ParseFromStream(new PROTO.Base64Stream(bodydata));
        console.log("Received Persistence from:",header,"Body:",body);
        console.log("My properties are:",this.mProperties);
        var respBody = new Sirikata.Persistence.Protocol.Response;
        var returnNames = (body.options & Sirikata.Persistence.Protocol.ReadWriteSet
            .ReadWriteSetOptions.RETURN_READ_NAMES) != 0;
        for (var i = 0; i < body.reads.length; i++) {
            var fname = body.reads[i].field_name;
            var outRead = respBody.reads.push();
            if (body.reads[i].index) {
                outRead.index = body.reads[i].index;
            }
            if (this.mProperties[fname] !== undefined) {
                outRead.data = this.mProperties[fname];
                // ttl?
                // subscription_id???
            } else {
                outRead.return_status = "KEY_MISSING";
            }
            if (returnNames) {
                outRead.field_name = fname;
            }
        }
        header.reply_id = header.id;
        header.destination_object = header.source_object;
        header.destination_port = header.source_port;
        header.id = undefined;
        header.source_port = undefined;
        header.source_object = undefined;
        this.mSpaceConnectionMap[header.source_space].service.getPort(Ports.PERSISTENCE)
            .send(header, respBody);
    };
    Sirikata.HostedObject.prototype._parseBroadcast = function (header, bodydata) {
        var body = new Sirikata.Protocol.Broadcast;
        body.ParseFromStream(new PROTO.Base64Stream(bodydata));
        console.log("Received Broadcast from:",header,"Body:",body);
    };

    Sirikata.HostedObject.prototype.sendMessage = function (destSpace, header, body) {
        var info = this.mSpaceConnectionMap[destSpace];
        if (!info) {
            Kata.error("Trying to send message to not-connected space "+destSpace);
        }
        info.rpcPort.send(header, body);
    };

    Sirikata.HostedObject.prototype.receivedMessage = function (channel, data) {
        /*
        var header = new Sirikata.Protocol.Header;
        var info, spaceid;
        header.ParseFromStream(new PROTO.Base64Stream(data));
        for (spaceid in this.mSpaceConnectionMap) {
            info = this.mSpaceConnectionMap[spaceid];
            if (info.stream == channel) {
                header.source_space = spaceid;
                header.destination_object = info.objectID;
                break;
            }
        }
        console.log("Object "+this.mID+" got message on port "+header.destination_port, header, data);
        if (!header.destination_port) {
            this.mPortHandlers[0].call(this, header, data);
        } else if (header.destination_port in this.mPortHandlers) {
            this.mPortHandlers[channel].call(this, header, data);
        } else {
            SUPER.receivedMessage.call(this, header, data);
        }
        */
    };
    Sirikata.HostedObject.prototype._sendNewProxQuery = function(data) {
        if (data.spaceid && data.radius) {
            var prox = new Sirikata.Protocol.NewProxQuery;
            prox.query_id = data.query_id || 0;
            prox.max_radius = data.radius;
            prox.min_solid_angle = data.min_angle || 0;
            var body = new Sirikata.Protocol.MessageBody;
            body.message_names.push("NewProxQuery");
            body.message_arguments.push(prox);
            var header = new Sirikata.Protocol.Header;
            header.destination_object = SPACE_OBJECT;
            header.destination_port = Ports.GEOM;
            this.sendMessage(data.spaceid, header, body);
        } else {
            Kata.error("Not enough information to send new prox query", data);
        }
    };

    Sirikata.HostedObject.prototype.messageFromSimulation = function (channel, data) {
        switch (data.msg) {
        case "ConnectToSpace":
            if (data.spaceid) {
                console.log("Connecting "+this.mID+" to space "+data.spaceid);
                this.connectToSpace(data.spaceid.toLowerCase());
            }
            break;
        case "DisconnectFromSpace":
            this.destroy(); //????
            break;
        case "Destroy":
            this.destroy(); //
            break;
        case "Move":
			console.log("dbm data:", data)
            this._parseMoveMessage(data,false);
            break;
        case "Mesh":
            {
                console.log("MESHED!");
                var meshURI = new Sirikata.Protocol.StringProperty;
                meshURI.value = data.mesh;
                this.setProperty("MeshURI", meshURI);
				this.mObjectHost.sendToSimulation(data);
            }
            break;
        case "DestroyMesh":
            // Sirikata protocol does not support this.
            this.unsetProperty("MeshURI");
            break;
        case "Light":
            {
                var lightInfo = new Sirikata.Protocol.LightInfoProperty;
                //lightInfo.
                /*
  diffuse_color:[.25,.5,1],
  specular_color: [.2,1,.5],
  power=1.0: //exponent on the light
  ambient_color: [0,0,0],
  light_range: 1.0e5
  constant_falloff: 0.5,
  linear_falloff: 0.2,
  quadratic_falloff: 0.1,
  cone_inner_radians: 0,
  cone_outer_radians: 0,
  cone_falloff: 0.5,
  type: "POINT",//options include "SPOTLIGHT" or "DIRECTIONAL"
  casts_shadow: true
                 */
                this.setProperty("LightInfo", lightInfo);
            }
            break;
        case "DestroyLight":
            // Sirikata protocol does not support this after connecting to a space.
            this.unsetProperty("LightInfo");
            break;
        case "SetPhysical":
            {
                var physParams = new Sirikata.Protocol.PhysicalParameters;
                this.setProperty("PhysicalParameters", physParams);
            }
            break;
        case "Proximity":
            if (data.spaceid) {
                data.queryid = data.queryid || 0;
                this.mSpaceConnectionMap[data.spaceid].proximity[data.queryid] = data;
                if (this.mSpaceConnectionMap[data.spaceid].objectID) {
                    this._sendNewProxQuery(data);
                }
            }
            break;
        }
    };

})();
