const express = require('express');
const app = express();
const fileUpload = require('express-fileupload');
const bcrpyt = require('bcrypt')
const session = require('express-session')
const flash = require('express-flash')
const {client} = require('./db');
const passport = require('passport');

const initializePassport = require('./passport-config')
initializePassport(passport);

app.set("view engine","ejs")
app.use(express.urlencoded({extended : false}))
app.use(session({
    secret : 'secret',
    resave : false,
    saveUninitialized: false,
}))
app.use(flash())
app.use(passport.initialize())
app.use(passport.session())

app.post("/users/register", async(req,res)=>{
    let {email,name,username,password,password2} = req.body;

    let errors = [];
    if(!name || !email || !password || !password2){
        errors.push({message: "please fill all the forms"})
    }

    if(password.length < 6){
        errors.push({message: "password should be at 6 characters long"})
    }

    
    if(password != password2){
        errors.push({message: "Password do not match"})
    }

    if(errors.length>0){
        res.render("register",{errors});
    }else{
        let hashpassword = await bcrpyt.hash(password,10);
        var query = `SELECT * FROM credential WHERE email = $1`;
        var query2 = `SELECT * FROM credential WHERE username = $1`;
        var query3 = `INSERT INTO credential(username,password,name,email) VALUES($1,$2,$3,$4)`;

        client.query(query,[email],(err, results) => {
            if(err) {
                console.log(err)
                return
            }
            console.log(results.rows);

            if(results.rows.length > 0 ) {
                errors.push({message : "email already taken"})
                res.render("register",{errors});
                return
            }
        })

        client.query(query2,[username],(err, results) => {
            if(err) {
                console.log(err)
                return
            }
            console.log(results.rows);

            if(results.rows.length > 0 ) {
                errors.push({message : "Username already taken"})
                res.render("register",{errors});
                return
            }
        })

        client.query(query3,[username,hashpasswords,name,email],(err, results) => {
            if(err) {
                console.log(err)
                return
            }
            req.flash('success_msg',"Berhasil menyimpan akun, silakan log in")
            res.redirect("/users/login")
          
        })
    }
})

app.get("/", (req,res) =>{
    res.render("home")
})

app.get("/users/register", (req,res) =>{
    res.render("register")
})

app.get("/users/login", (req,res) =>{
    res.render("login")
})

app.get("/users/dashboard", (req,res) =>{
    res.render("dashboard", { user: req.user.name });
})

app.get("/users/dashboard2", (req,res) =>{
    res.render("dashboard2", { user: req.user.name });
})

app.post("/users/login",passport.authenticate('local',{
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/login",
    failureFlash: true
}))

app.get("/users/logout", (req,res) => {
    req.logOut();
    req.flash("success_msg","Logged Out")
    res.redirect("/users/login")
})


app.listen(5000, () => {
    console.log('Program berjalan pada port 5000');
});