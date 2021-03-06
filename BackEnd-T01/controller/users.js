const User= require("../models/user.js")
const path = require('path');
const fs = require('fs');
const AWS_S3 = require("../util/aws-s3.js");

module.exports.findUserById = function(req, res){
    User.findOne({_id: req.params.id_session})
    .then(user => {
        res.status(200).send(user);
        
    })
    .catch(err => {
        console.log(err);
        res.status(404).send("User not found");
    });
}

module.exports.findUser = function(req, res){
    User.findOne({username: req.params.username})
    .then(user => {
        res.status(200).send(user)
    })
    .catch(err => {
        console.log(err);
        res.status(404).send("User not found");
    });
}

function deleteFile(dir, file) {
    return new Promise(function (resolve, reject) {
        var filePath = path.join(dir, file);
        fs.lstat(filePath, function (err, stats) {
            if (err) {
                return reject(err);
            }
            if (stats.isDirectory()) {
                resolve(deleteDirectory(filePath));
            } else {
                fs.unlink(filePath, function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            }
        });
    });
};

module.exports.addUser = function(req, res){
    User.exists({username: req.body.username})
    .then(user => {
        if(user.username){
            res.status(500).send("Username already in use");
        }
        else{
            const user = new User(req.body);
            user
            .save()
            .then(newUser => {
                const new_filename = newUser._id+"/profilePic/"+ req.file.originalname;
                AWS_S3.uploadFileS3(new_filename, req.file.path)
                .then((aws_s3_file ) => {
                    User.findByIdAndUpdate(newUser._id, {$set:{profilePicture:aws_s3_file.Location}},{new:true})
                    .then(old_photo => {
                        deleteFile(req.file.destination, req.file.originalname)
                        .then(()=>{
                            res.status(200).send(newUser._id);
                        })                    
                    })
                })
            })
            .catch((err => {
                console.log(err);
            }));  
        }
    })   
    .catch((err => {
        console.log(err);
    }))
}

module.exports.updateUser = function(req, res){
    User.findOneAndUpdate({_id:req.body.userId}, {$set:{name:req.body.name, password:req.body.password, email: req.body.email}},{new:true})
    .then(old_aluno => {
        if(req.file!=undefined){
            const new_filename = req.body.userId+"/profilePic/"+ req.file.originalname;
            AWS_S3.uploadFileS3(new_filename, req.file.path)
            .then((aws_s3_file) => {
                User.findByIdAndUpdate(req.body.userId, {$set:{profilePicture:aws_s3_file.Location}},{new:true})
                .then(old_photo => {
                    deleteFile(req.file.destination, req.file.originalname)
                    .then(()=>{
                        res.send();
                    })                    
                })
            })        
        }     
    })
    .catch(err => {
        console.log(err);
        res.status(404).send("User not found");
    });
}

module.exports.loginUser = function(req, res){
    User.findOne({username: req.body.username})
    .then(user => {
        if(user.password.toString() === req.body.password.toString()){
            res.status(200).send(user._id);
        }
        else{
            res.status(500).send("Senha incorreta"); 
        }
        
    })
    .catch(err => {
        console.log(err);
        res.status(404).send("User not found");
    });
}

