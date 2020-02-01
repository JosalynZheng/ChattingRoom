let http = require("http"),
	socketio = require("socket.io"),
    fs = require("fs");
let app = http.createServer(function(req, resp){      
    fs.readFile("client.html", function(err, data){           
        if(err) return resp.writeHead(500);
        resp.writeHead(200);
        resp.end(data);
    });
});
app.listen(3456);
let rooms = {
	names:[],
	passwords:[],
	creator:[]
	};
let users = {
	name:[],
	id:[]
	};
let creator = {};
let passwords = {};
let banname = {};
let friend = {};
let io = socketio.listen(app);
io.sockets.on("connection", function(socket){
	console.log(io.sockets.id);
	io.sockets.emit('rooms',rooms);
	let username;
	socket.on('success', function(data){
		console.log("====A user has login");
		username = data["username"]
		if (username in users) {
			socket.room="public";
			socket.join("public");
			socket.name=data;
			io.sockets.emit("message_to_client", {message:data+" joined chatting room"});		
		} else{
			socket.room="public";
			socket.join("public");
			socket.name=data;
			users.name.push(data);
			users.id.push(socket.id);
			io.sockets.emit("message_to_client", {message:data+" joined chatting room"});	
		}
	});
	socket.on('message_to_server', function(data) {
		console.log("message: "+data["message"]);
		console.log("socket.room " + socket.room);
		io.in(socket.room).emit("message_to_client",{message:data["message"] });
		
	});
	
	socket.on('create', function(data){	
		console.log("create a room");
		const roomname = data["room"];
		const psw = data["roompwd"];
		const user = data["user"];		
		socket.join(roomname);
		socket.room=roomname;
		friend[roomname] = [];
		banname[roomname] = [];
		creator[roomname] = [];
		passwords[roomname] = [];
		if(rooms.names.indexOf(roomname) == -1){
			rooms.names.push(roomname);
			rooms.passwords.push(psw);
			rooms.creator.push(user);
			friend[roomname].push(user);
			creator[roomname].push(user);
			passwords[roomname].push(user);
		}
		let Rooms = JSON.stringify(rooms);
		console.log("room information: "+ Rooms);
		console.log("user information: "+ user);
		console.log("send to "+ socket.id);
		let friendlist = JSON.stringify(friend[roomname]);
		io.sockets.to(socket.id).emit("roomready", {
			Rooms: Rooms,
			user: user,
			friend : friendlist,
			type: "create"
		});
	});

	socket.on('joinroom', function(data){
		console.log("here");
		const roomname = data["r"];
		const psw = data["roompwd"];
		const user = data["u"];
		let index = rooms.names.indexOf(roomname);
		console.log(banname);

		if(banname[roomname].indexOf(user) == -1){
			console.log("in");
			if (psw===rooms.passwords[index]){
				console.log("psw correct");
				socket.join(roomname);
				console.log("JOINED THE ROOM in joinroom")
				if(friend[roomname].indexOf(user) == -1){
					friend[roomname].push(user);
				}
				console.log(friend);				
				let Rooms = JSON.stringify(rooms);
				let friendlist = JSON.stringify(friend[roomname]);
				let pswlist = JSON.stringify(passwords[roomname]);
				let creatorlist = JSON.stringify(creator[roomname]);
				io.sockets.in(roomname).emit("roomready", {
					Rooms: Rooms,
					friend : friendlist,
					psw: pswlist,
					creator: creatorlist,
					user: user,
					type: "join"
				});
			}else{
				console.log("fail");
				let Rooms = JSON.stringify(rooms);
				io.sockets.in(roomname).emit("joinfail", {
					Rooms: Rooms,
					user: user
				});
			}	
		}else{
			io.sockets.emit('back',{
				user: user,
				type: "ban"
			});
		}
	});
	socket.on('getcreator',function(data){
		let roomname = data["room"];
		let ind = rooms.names.indexOf(roomname);
		let cre = rooms.creator[ind];
		console.log(cre);
		io.sockets.in(roomname).emit("get", {
			creator: cre
		});
	});
	socket.on('kick', function(data){
		let user = data["u"];
		console.log(user);
		let roomname = data["room"];
		let ind = rooms.names.indexOf(roomname);		
		let creator = rooms.creator[ind];
		console.log(creator);
		console.log(user+" kicked by "+ creator);
		io.sockets.emit('back',{
			user: user,
			type: "kick"
		});
	});
	socket.on('operation', function(data){
		let user = data["u"];
		let roomname = data["room"];
		console.log(roomname);
		let id = friend[roomname].indexOf(user);
		if (id > -1) {
			socket.leave(socket.room);
			socket.room="public";
			socket.join("public");
			friend[roomname].splice(id, 1);
		}
	});
	socket.on('ban', function(data){
		console.log("in");
		let user = data["u"];
		let creator = data["cre"];
		let roomname = data["room"];
		banname[roomname] = [];
		banname[roomname].push(user);
		console.log(banname);
		io.sockets.emit('back',{
			user: user,
			type: "ban"
		});
	});
	socket.on("pri_chat", function(data){
		console.log("HERE in private chat");
		let msg = data["message"];
		let To = data["username"];
		io.sockets.emit('prisuccess', {
			message: msg,
			username: To
		});
	});
	socket.on('invite', function(data){
		let room = data["roomname"];
		let sender = data["sender"];
		let toinvite = data["toinvite"];
		io.sockets.emit('invitesuccess',{
			toinvite: toinvite,
			sender: sender,
			roomname: room
		});	
	});
	socket.on('inviteresponse', function(data){
		let roomname = data["room"];
		let toinvite = data["toinvite"];
		socket.join(roomname);
		console.log("JOIN ROOM in inviteresponse")
		socket.room=roomname;
		if(friend[roomname].indexOf(toinvite) == -1){
			friend[roomname].push(toinvite);
		}
		let Rooms = JSON.stringify(rooms);
		let friendlist = JSON.stringify(friend[roomname]);
		io.sockets.emit('roomready',{
			Rooms: Rooms,
			friend : friendlist,
			user: toinvite,
			type: "join"
		});
	});
});