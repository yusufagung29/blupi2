const LocalStrategy = require("passport-local").Strategy;
const { client } = require("./db");
const bcrypt = require("bcrypt");

function initialize(passport) {

  const authenticateUser = (email, password, done) => {
    client.query(
      `SELECT * FROM customer WHERE email = $1;`,
      [`${email}`],
      (err, results) => {
        if (err) {
          throw err;
        }

        if (results.rows.length > 0) {
          const user = results.rows[0];

          bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
              console.log(err);
            }
            if (isMatch) {
              return done(null, user);
            } else {
              //password is incorrect
              return done(null, false, { message: "Password is incorrect" });
            }
          });
        } else {
            client.query(`select * from customer where username = $1`,[`${email}`],(err,results)=>{
              if (results.rows.length > 0) {
                const user = results.rows[0];
      
                bcrypt.compare(password, user.password, (err, isMatch) => {
                  if (err) {
                    console.log(err);
                  }
                  if (isMatch) {
                    return done(null, user);
                  } else {
                    //password is incorrect
                    return done(null, false, { message: "Password is incorrect" });
                  }
                });
              }else{
                client.query(`select * from customer where phone = $1`,[`${email}`],(err,results)=>{
                  if (results.rows.length > 0) {
                    const user = results.rows[0];
          
                    bcrypt.compare(password, user.password, (err, isMatch) => {
                      if (err) {
                        console.log(err);
                      }
                      if (isMatch) {
                        return done(null, user);
                      } else {
                        //password is incorrect
                        return done(null, false, { message: "Password is incorrect" });
                      }
                    });
                  }else{
                    client.query(`select * from admincred where username = $1`,[`${email}`],(err,results)=>{
                      if (results.rows.length > 0) {
                        const user = results.rows[0];
              
                        bcrypt.compare(password, user.password, (err, isMatch) => {
                          if (err) {
                            console.log(err);
                          }
                          if (isMatch) {
                            return done(null, user);
                          } else {
                            //password is incorrect
                            return done(null, false, { message: "Password is incorrect" });
                          }
                        });
                      }else{
                        return done(null, false, {
                          message: "No user with that credential"
                        });
                      }//po
                    })
                  }//po
                })
              }//po
            })
        } //p

      }
    );
  };


  
  passport.use(
    new LocalStrategy(
      { usernameField: "username", passwordField: "password" },
      authenticateUser
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser((id, done) => {
    client.query(`SELECT * FROM customer WHERE id = $1`, [id], (err, results) => {
      if (err) {
        return done(err);
      }
      if(results.rows.length>0){
        return done(null, results.rows[0]);
      }
      else{
        client.query(`select * from admincred where id = $1`,[id],(err,results)=>{
          return done(null, results.rows[0]);
        })
      }

    });
  });
}

module.exports = initialize;
