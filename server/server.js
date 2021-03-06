require('./config/config.js');
const _ = require('lodash'); //provides utility fns like pick
var express = require('express');
var bodyParser = require('body-parser');
var {ObjectID} = require('mongodb');
//express lets us make a server and deploy our application on a local host
//body-parser lets us send string type JSON objects to server
var {mongoose} = require('./db/mongoose.js');
var {Todo} = require('./models/todo');
var {User} = require('./models/users');
var {authenticate} = require('./middleware/authenticate');
var app = express();
const port = process.env.PORT||3000;

app.use(bodyParser.json());

app.post('/todos', authenticate, (req,res) => {
    console.log(req.body);
    var todo = new Todo({
        text:req.body.text,
        _creator:req.user._id
    });
    todo.save().then((doc) => {
        res.send(doc);
    }, (e) => {
        res.status(400).send(e);
    });
});

//to read data - GET '/todos'

app.get('/todos', authenticate, (req,res) => {
   Todo.find({
       _creator:req.user._id
   }).then((todos) => {
       res.send({todos});
   }, (e) => {
       res.status(400).send(e);
   });
});


app.get('/todos/:id',authenticate, (req,res) => {
    var id = req.params.id;
    if(!ObjectID.isValid(id)) {
        res.status(404).send();
    }
    Todo.findOne({
        _id:id,
        _creator:req.user._id
    }).then((todo) => {
        if(!todo) {
            return res.status(404).send();
        }
        
        res.send({todo});
    }).catch((e) => {
       res.status(400).send(); 
    });
});

app.delete('/todos/:id',authenticate, (req,res) => {
   var id = req.params.id;
    if(!ObjectID.isValid(id))   {
    return res.status(404).send();
    }
    Todo.findOneAndRemove({
        _id:id,
        _creator:req.user._id
    }).then((todo) => {
        if(!todo) {
            return res.status(404).send();
        }
        res.send({todo});
    }).catch((e) => {
        res.status(400).send();
    });
});

app.patch('/todos/:id',authenticate, (req,res) => {
   var id = req.params.id;
    var body = _.pick(req.body, ['text','completed']);
//body will store the properties we allow user to update 
    if(!ObjectID.isValid(id))   {
    return res.status(404).send();
    }
    if(_.isBoolean(body.completed) && body.completed) {
        body.completedAt = new Date().getTime();
    } else {
        body.completed = false;
        body.completedAt = null;
        //if we want to remove a property from database set it to null
    }
    
    Todo.findOneAndUpdate({
        _id:id,
        _creator:req.user._id
    }, {$set: body}, {new:true}).then((todo) => {
        //new is same as returnOriginal same in mongoose-update, it means return the new object
        if(!todo) {
            return res.status(404).send();
        }
        res.send({todo});
    }).catch((e) =>   {
        res.status(400).send();
    });
});

app.post('/users',(req,res) =>{
 console.log(req.body);
    var body = _.pick(req.body, ['email','password']);
    var user = new User(body);                  
    user.save().then(() => {
       return user.generateAuthToken();
        //res.send(user);
    }).then((token) => {
        //header contains key value pair key name is x-auth when we add x- before key it means it is not default we add it and token is its value
        res.header(`x-auth`,token).send(user);
    }).catch((e) => {
        res.status(400).send(e);
    });
});

var authenticate = (req,res,next) => {
   var token = req.header('x-auth'); 
    User.findByToken(token).then((user) => {
        if(!user) {
            return Promise.reject();
        }
        req.user = user;
        req.token = token;
        next();
    }).catch((e) => {
        res.status(401).send();
    }); 
};

app.get('/users/me',authenticate, (req,res) => {
   var token = req.header('x-auth'); 
    User.findByToken(token).then((user) => {
        if(!user) {
            return Promise.reject();
        }
        res.send(user);
    }).catch((e) => {
        res.status(401).send();
    });
});

app.post('/users/login', (req,res) => {
    var body = _.pick(req.body, ['email','password']);
    User.findByCredentials(body.email,body.password).then((user) => {
        return user.generateAuthToken().then((token) => {
    res.header(`x-auth`,token).send(user);
    });
    }).catch((e) => {
        res.status(400).send();
    });
});

app.delete('/users/me/token',authenticate, (req,res) => {
    req.user.removeToken(req.token).then(() => {
       res.status(200).send(); 
    },() => {
        res.status(400).send();
    });
});

app.listen(port, () => {
   console.log(`Started on port ${port}`); 
});

//we can also check http statuses like 200,404 for errors go to httpstatuses.com for more info
//var newTodo = new Todo({
//    text:'Cook dinner'
//});
//
//newTodo.save().then((docs) => {
//    console.log('Saved todo ',docs)
//},(e) => {
//    console.log('Unable to save todo')
//});

//var Todo2 = new Todo({
//    text:'Something to do'   //typecasting exists so we can set text to a number or a boolean and it will be converted to a string
//});


//
//var user = new User({
//   email:'nikvats5499@gmail.com' 
//});
//
//user.save().then(() => {
//    console.log('User saved');
//}, (e) => {
//   console.log('Unable to save user', e); 
//});

//Todo2.save().then((doc)=>{
//    console.log(JSON.stringify(doc,undefined,2));
//},(e) => {
//         console.log('Unable to connect');        
//});

module.exports = {app};
