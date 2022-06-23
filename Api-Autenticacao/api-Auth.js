const express = require('express')
const app = express()
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require('cors')

app.use(express.json());
app.use(cors({origin: '*'}))

const Users = require("./models/Users");
const port = 3001
const JWTsecret = "teste123";

// TODO TRATAMENTO DE ERRO E INPUT
// ADICIONAR CHECK ADMIN

function checkToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader;
  if (!token || token=="") {
      return res.status(401).json({ msg: "Voce precia de um token!" });
  }
  try {
      jwt.verify(token, JWTsecret);
      next();
  } catch (err) {
      res.status(400).json({ msg: "O Token e invalido!" });
  }
}

// Enforce check admin ( nao ta funfando )
async function checkAdmin(req, res, next) {
  const token = req.headers["authorization"];
  const decodedjwt = jwt.decode(token)
  const admin = await Users.findOne({ tx_email: decodedjwt.tx_email, is_admin: true });
  if ( !admin || admin == "" || admin == null ){
      console.log("aqui")
      res.status(403).json({ msg: "Voce nao tem permissao para acessar aqui!" });
      return false
  }
}



app.get('/', (req, res) => {
  res.send('Aqui e a API de autenticacao')
})
// Route to list all users
app.get("/users/", checkToken, async (req, res) => {
  await checkAdmin(req, res)
  var users = await Users.find({},"-hs_auth");
  res.status(200).json({ users });
});

app.post("/users/", checkToken, async (req, res) => {
  // if (!await checkAdmin(req, res)){
  //   return
  // }
  const { email , is_admin } = req.body;
  var user = await Users.findOne({ tx_email: email });
  
  if ( !user || user==""){
    return res.status(400).json({ msg: "Usuario nao existe" });
  }

  const result = await Users.updateOne({_id: user._id}, {$set: {is_admin:is_admin}});
  user = await Users.findOne({ tx_email: email });
  
  user.hs_auth = ""
  res.status(200).json({ user });
});

app.post("/users/atualizasaldo", checkToken, async (req, res) => {
  await checkAdmin(req, res)
  const { email , saldo } = req.body;
  // verify if exist
  var user = await Users.findOne({ tx_email: email });
  
  if ( !user || user==""){
    return res.status(400).json({ msg: "Usuario nao existe" });
  }

  const result = await Users.updateOne({_id: user._id}, {$set: {vl_saldo:saldo}});
  user = await Users.findOne({ tx_email: email });
  
  user.hs_auth = ""
  res.status(200).json({ user });
});


// Route to create user
app.post("/users/register", async (req, res) => {
  const { name, email, password } = req.body;
  
  // check if user exists
  var user = await Users.findOne({ tx_email: email });
  // if user exists, return error 
  // use a random message to prevent user enumeration
  if (user) {
    return res.status(400).json({ msg: "Erro ao criar usuario" });
  }
  
  // HASH Before save
  const salt = await bcrypt.genSalt(12);
  const hs_auth = await bcrypt.hash(password, salt);
  user = {
    no_usuario: name,
    tx_email: email,
    hs_auth: hs_auth,
    vl_saldo: 10,
    is_admin: false
  };
  // save user
  Users.create(user);
  user.hs_auth = ""
  res.status(201).json({ user });
});

// Route to login user
app.post("/users/login", async (req, res) => {
  const { email, password } = req.body;

  const salt = await bcrypt.genSalt(12);
  const hs_auth = await bcrypt.hash(password, salt);
  var user = await Users.findOne({ tx_email: email });
  const checkPassword = await bcrypt.compare(password, user.hs_auth);
  if (!user || !checkPassword) {
    return res.status(400).json({ msg: "Usuario nao encontrado ou senha invalida" });
  }
  // JWT
  const token = jwt.sign({tx_email: user.tx_email,is_admin: user.is_admin}, JWTsecret);

  user.hs_auth = ""
  res.status(200).json({ user, token });
});

app.get("/user/", checkToken, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader;
  const decodedjwt = jwt.decode(token)
  const user = await Users.findOne({ tx_email: decodedjwt.tx_email});
  user.hs_auth = ""
  res.status(200).json({ user });
});


mongoose.connect('mongodb://127.0.0.1:27017/usuarios') .then(() => {
  console.log("Conectou ao banco!");
  app.listen(port, () => {
    console.log(`API de Autenticacao na porta: ${port}`)
  })    
})
.catch((err) => console.log(err));



