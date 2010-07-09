
Kata.include("externals/protojs/protobuf.js");
Kata.include("externals/protojs/pbj.js");
Kata.include("network/sirikata/scripts/BasicScript.js");
(function() {
    var SUPER = Sirikata.BasicScript.prototype;
    Sirikata.DeferScript = function(channel,args){
        var deferTime=args.defertime;
        SUPER.constructor.call(this,
                               channel,
                               args,
                               function(){
                                   setTimeout(function(){                       
                                                  if (args.deferpos) {
												  	args.pos = args.deferpos;
													console.log("deferpos:", args.deferpos)
												  }
                                                  if (args.deferscale) {
												  	args.scale = args.deferscale;
													console.log("deferscale:", args.deferscale)
												  }
                                                  if (args.deferorient)
                                                      args.orient=args.deferorient;
                                                  args.msg="Move";
                                                  channel.sendMessage(args);
                                              },
                                              deferTime);
                               });
    };
    Kata.extend(Sirikata.DeferScript, SUPER);
})();


