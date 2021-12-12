
const express = require('express');
const app = express();
const fileUpload = require('express-fileupload');
const bcrpyt = require('bcrypt')
const session = require('express-session')
const flash = require('express-flash')
const {client} = require('./db');
const passport = require('passport');
const fs = require('fs');

const initializePassport = require('./passport-config')
initializePassport(passport);

 
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended : false}))
app.use(session({
    secret : 'secret',
    resave : false,
    saveUninitialized: false,
}))
app.use(flash())
app.use(passport.initialize())
app.use(passport.session())
app.use(express.static(__dirname+'/public'));
app.use(fileUpload());

app.get('/',checkauth,function(req, res) {
    
    const query = `SELECT * FROM produk`;
    client.query(query , [], (err, results) => {
        if (err) {
            return;
        }
        res.render('pages/index', {
            model: results.rows
          });
    });    
});



app.get('/login',checkauth,function(req,res){
    res.render('pages/login')
})


app.get('/admin', function(req, res) {
    const query = `SELECT * FROM produk`;
    client.query(query , [], (err, results) => {
        if (err) {
            return;
        }
        res.render('pages/admin', {
            user : req.user,
            model: results.rows
          });
    })  
});

app.get('/order', function(req, res) {
    const query = `SELECT * FROM order_list`;
    client.query(query , [], (err, results) => {
        if (err) {
            return;
        }
        res.render('pages/order', {
            user : req.user,
            model: results.rows
          });
    })  
});

app.get('/order/:id', async (req, res) => {
    const query = `SELECT * FROM order_list where id_order = $1`;
    client.query(query , [req.params.id], (err, results) => {
        if (err) {
            return;
        }
        let jsonFile = results.rows[0].order_json
        let readJson = fs.readFileSync(`public/JSON/${jsonFile}`);
        let orderJson = JSON.parse(readJson);
        console.log(results.rows)

        res.render('pages/orderdetail', {
            order : orderJson['table'],
            user : req.user,
            model: results.rows,
            idO : results.rows[0].id_order
          });
    })  
});


app.get('/produk/:id', async (req, res) => {
    

    const id = req.params.id;
    const query = `SELECT * FROM produk WHERE id_p = $1 `;
    client.query(query, [id], (err, results) => {
        if (err) {
            return;
        }
        res.render('pages/details', {
            model: results.rows[0],
            user: req.user
          });
    });
})
app.post("/produk/:id", (req, res) => {

    const id = [req.body.nama_acc, req.body.jumlah, req.body.metode_transaksi, req.params.id];
    const query1 = `INSERT INTO transaksi(id_p, nama_acc, nama_prod, nama_cust, jumlah, harga_prod, metode_transaksi) VALUES($4, $1, (SELECT nama_prod FROM produk WHERE id_p=$4), (SELECT nama_cust FROM akun_p WHERE nama_acc = $1), $2, (SELECT harga FROM produk WHERE id_p = $4), $3)`;
    client.query(query1, id, (err, result) => {
    if (err) {
    return;
    }
    });

    const data = [req.body.jumlah,req.params.id];
    const query2 = `UPDATE produk SET jumlah_stok = (SELECT jumlah_stok FROM produk WHERE id_p = $2) - $1 WHERE id_p = $2`;
    client.query(query2, data, (err, result) => {
    if (err) {
    return;
    }
    });
    
    res.redirect("/");
});


//GET and POST for add product
app.get("/create", (req, res) => {
    res.render("pages/create");
});
app.post("/create", (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }
    let uploadedFile = req.files.gambar;
    let image_name = uploadedFile.name;
    //upload image file to directory public/images/
    uploadedFile.mv(`public/images/${image_name}`, (err ) => {
        if (err) {
            return res.status(500).send(err);
        }
    });

    const query = `INSERT INTO produk(nama_prod, jumlah_stok, harga, deskripsi,gambar) VALUES ($1, $2, $3, $4,$5)`;
    const produk = [req.body.Nama, req.body.Jumlah, req.body.Harga, req.body.Deskripsi,req.files.gambar.name];
    client.query(query, produk, (err, result) => {
    if (err) {
    return;
    }
    });
    
    res.redirect("/admin");
});

app.get("/register",checkauth, async(req, res) => {
    res.render("pages/register");
});

app.post("/register", async (req, res) => {
    let {email,name,username,password,password2,phone,address} = req.body;

    let errors = [];
    if(!name || !username || !email || !password || !password2 || !phone || !address){
        errors.push({message: "Silakan isi semua form"})
    }

    if(password.length < 6){
        errors.push({message: "Password minimal terdiri dari 6 karakter"})
    }

    
    if(password != password2){
        errors.push({message: "Password tidak sesuai"})
    }

    if(errors.length>0){
        res.render("pages/register",{errors});
    }else{
        let hashpassword = await bcrpyt.hash(password,10);
        var query = `SELECT * FROM customer WHERE email = $1`;
        var query2 = `SELECT * FROM customer WHERE username = $1`;
        var query3 = `INSERT INTO customer(username,password,name,email,phone,address) VALUES($1,$2,$3,$4,$5,$6)`;

        client.query(query,[email],(err, results) => {
            if(err) {
                return
            }

            if(results.rows.length > 0 ) {
                errors.push({message : "Email telah terdaftar"})
                res.render("pages/register",{errors});
                return
            }
        })

        client.query(query2,[username],(err, results) => {
            if(err) {
                return
            }

            if(results.rows.length > 0 ) {
                errors.push({message : "Username telah terdaftar"})
                res.render("pages/register",{errors});
                return
            }
        })

        client.query(query3,[username,hashpassword,name,email,phone,address],(err, results) => {
            if(err) {
                return
            }
            req.flash('success_msg',"Berhasil menyimpan akun, silakan log in")
            res.redirect("/login")
          
        })
    }
})


//GET and POST for edit product
app.get("/edit/:id", (req, res) => {
    const id = req.params.id;
    const query = `SELECT * FROM produk WHERE id_p = $1`;
    client.query(query , [id], (err, results) => {
        if (err) {
            return;
        }
        res.render('pages/edit', {
            model: results.rows[0]
        });
    });  
});

app.post("/edit/:id", (req, res) => {

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }
    let uploadedFile = req.files.gambar;
    let image_name = uploadedFile.name;
    //upload image file to directory public/images/
    uploadedFile.mv(`public/images/${image_name}`, (err ) => {
        if (err) {
            return res.status(500).send(err);
        }
    });

    const id = req.params.id;
    const query = `UPDATE produk SET nama_prod = $1, jumlah_stok = $2, harga = $3, deskripsi = $4,gambar=$5 WHERE id_p = $6`;
    const produk = [req.body.Nama, req.body.Jumlah, req.body.Harga, req.body.Deskripsi,req.files.gambar.name, id];
    client.query(query , produk, (err, results) => {
        if (err) {
            return;
        }
    }); 
    res.redirect("/admin");
});

//GET and POST for delete product

app.get("/delete/:id", (req, res) => {
    const id = req.params.id;
    const query = `DELETE FROM produk WHERE id_p = $1`;
    client.query(query , [id], (err, results) => {
        if (err) {
            return;
        }
    }); 
    res.redirect("/admin");
});

app.post("/payment", (req, res) => {
    console.log(req.body.payment)
    if (req.body.payment != "paid"){
        res.redirect("/order")
    }
    console.log("sukses")
    console.log("Id adalah"+ req.body.idOrder)
    const id = req.body.idOrder;
    const query = `update order_list set payment = $1, proceed = 1 WHERE id_order = $2`;
    client.query(query , [req.body.payment, id], (err, results) => {
        if (err) {
            return;
        }
        console.log("sukses2")
    }); 
    res.redirect("/order");
});


app.post("/login",passport.authenticate('local',{
    failureRedirect: "/login",
    failureFlash: true
}), (req,res)=>{
    if(req.user.username!="admin"){
        res.redirect("/dashboard")
    }else{
        client.query(`select * from admincred where username =$1`,[req.user.username],(err,results)=>{
            if(results.rows.length>0){
                res.redirect("/admin")
            }else{
                req.logOut();
                res.redirect("/login")
            }
        })

    }
})


app.get("/dashboard",checknotauth, (req,res) =>{
    const query = `SELECT * FROM produk`;
    client.query(query , [], (err, results) => {
        if (err) {
            return;
        }
        res.render('pages/dashboard', {
            model: results.rows,
            user : req.user
          });
    });  
})

app.get("/logout", (req,res) => {
    req.logOut();
    req.flash("success_msg","Logged Out")
    res.redirect("/login")
})


app.post("/addcart",checknotauth, (req, res) => {
    const cart = [req.user.id,req.body.id_p,req.body.count];
    const opening = `SELECT * FROM buy_list WHERE id_c = $1 AND id_prod = $2`;
    const query = `INSERT INTO buy_list (id_c,id_prod,count) VALUES($1,$2,$3)` ;
    const query2 = `UPDATE buy_list set count = count+1 WHERE id_c = $1 AND id_prod = $2`;
    client.query(opening,[req.user.id,req.body.id_p], (err,results)=>{
        if(results.rows.length >0){
            client.query(query2,[req.user.id,req.body.id], (err,results)=>{
                if (err){
                    throw err
                }
                res.redirect("/dashboard"); 
            })
        }else{
            client.query(query,cart, (err,results)=>{
                if (err){
                    throw err
                }
                res.redirect("/dashboard"); 
            }) 
        }
    })
});

app.get("/cart", (req,res)=>{
    const user = [req.user.id]
    const query = `select * from cart where id_c = $1`
    client.query(query,user, (err,results)=>{
        var subTotal = 0;
        for(i = 0; i<results.rows.length;i++){
            var priceCount = results.rows[i].harga*results.rows[i].count;
            subTotal = subTotal + priceCount;
        }
        console.log(priceCount)
        if(err){
            throw err
        }
        res.render('pages/cart', {
            total : subTotal,
            model: results.rows,
            user : req.user
          });
    });    
})

app.post("/confirm", async(req,res)=>{
    const user = [req.user.id]
    const query = `select * from cart where id_c = $1`
    client.query(query,user, (err,results)=>{
        if(err){
            throw err
        }
        var confirmJson = `${req.user.id}` + ".json"
        var data = {}
        data.table = []
        for(i = 0 ; i < results.rows.length; i++){
            var obj = {
                id : req.user.id,
                produk : results.rows[i].nama_prod,
                count : results.rows[i].count,
                harga : results.rows[i].harga,
                gambar : results.rows[i].gambar,
                deskripsi : results.rows[i].deskripsi
            }
            data.table.push(obj)
        }
        fs.writeFile(`public/JSON/${confirmJson}`,JSON.stringify(data),function(err){
            if(err) throw err;
            console.log('complete');
            
        });
        client.query(`INSERT INTO order_list (id_p,nama_p,alamat_p,no_telpon,order_json,delivery) VALUES ($1,$2,$3,$4,$5,$6);`,[
            req.user.id, req.user.name, req.user.address, req.user.phone, confirmJson,req.body.delivery])
        client.query(`DELETE FROM buy_list WHERE id_c = $1;`,[req.user.id])
    });    
    res.redirect("/")
})

app.get("/account", (req,res)=>{
    const user = [req.user.id]
    const query = `select * from customer where id = $1`
    client.query(query,user, (err,results)=>{
        if(err){
            throw err
        }
        res.render('pages/account', {
            model: results.rows,
            user : req.user
          });
    });    
})

app.post("/account", (req, res) => {
    let uploadedFile = req.files.gambar;
    let user = req.user.id;
    let image_name = `${user}`+'.png';
    console.log(image_name);
    uploadedFile.mv(`public/account-img/${image_name}`, (err ) => {
        if (err) {
            return res.status(500).send(err);
        }
    });

    const query = `UPDATE customer SET username = $1, address = $2, image = $3 WHERE id = $4`;
    const produk = [req.body.username,req.body.address,image_name,req.user.id];
    client.query(query, produk, (err, result) => {
    if (err) {
    return;
    }
    });
    
    res.redirect("/account");
});

app.post("/deletecart", (req,res)=>{
    const user = [req.user.id,req.body.id]
    const query = `DELETE FROM buy_list where id_c = $1 and id_prod = $2`
    client.query(query,user, (err,results)=>{
        if(err){
            throw err
        }
        res.redirect('/cart');
    });    
})

app.get("/deletecart/:id",(req,res)=>{
    const query = "delete from buy_list where id_c = $1 AND id_prod = $2"
    const data = [req.user.id,req.params.id]
    client.query(query,data,(err,results)=>{
        res.redirect("/cart")
    })
})

function checkauth(req,res,next){
    if(req.isAuthenticated()){
        return res.redirect("/dashboard")
    } 
    return next()
}

function checknotauth(req,res,next){
    if(req.isAuthenticated()){
        return next();
    } 
    res.redirect("/login")
}

app.get("/regadmin",(req,res)=>{
    res.render("pages/regadmin")
})

app.post("/regadmin", async (req,res)=>{
    let hashpassword = await bcrpyt.hash(req.body.password,10);
    const query = `insert into admincred (username,password) values ('admin',$1) `
    const admin = [hashpassword]
    client.query(query,admin,(err,results)=>{
        res.redirect("/")
    })
})

app.get("/category",(req,res)=>{
    res.render("pages/category/catdashboard")
})

app.get("/category/laki",(req,res)=>{
    client.query(`select * from produk where subcategory1 = 'laki';`,(err,results)=>{
        if(err){
            throw (err)
        }
        res.render("pages/perempuan",{
            model : results.rows
        })
    })

})

app.get("/category/baju",(req,res)=>{
    client.query(`select * from produk where category = 'baju';`,(err,results)=>{
        if(err){
            throw (err)
        }
        res.render("pages/perempuan",{
            model : results.rows
        })
    })

})


app.listen(5000, () => {
    
});