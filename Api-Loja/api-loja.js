const express = require('express')
const app = express()
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require('cors')

app.use(express.json());
app.use(cors({origin: '*'}))

const Produtos = require("./models/Produtos");
const Users = require("./models/Users");

const port = 3030
const JWTsecret = "teste123";

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

async function checkAdmin(req, res, next) {
    const token = req.headers["authorization"];
    const decodedjwt = jwt.decode(token)
    const admin = await Users.findOne({ tx_email: decodedjwt.tx_email, is_admin: true });
    if ( !admin || admin == "" || admin == null ){
        console.log("aqui")
        return res.status(403).json({ msg: "Voce nao tem permissao para acessar aqui!" });
    }
}



app.get('/', async (req, res) => {
    res.send('Aqui e a API da Loja')
})

app.get('/produtos/', async (req, res) => {
    var produtos = await Produtos.find({});
    res.status(200).json({ produtos });
})

app.post('/produtos/cadastro', checkToken, async (req, res) =>{
    await checkAdmin(req, res)
    const { name, descr, quantidade, valor } = req.body;
  
    // check if product exists
    var produto = await Produtos.findOne({ no_produto: name });
    if (produto) {
        console.log("aqui2")
      return res.status(400).json({ msg: "Produto ja existe" });
    }
    
    produto = {
        no_produto: name,
        ds_produto: descr,
        qt_estoque: quantidade,
        vl_valor: valor,
    };

    // save produto
    Produtos.create(produto);
    res.status(201).json({ produto });
})

app.post('/produtos/altera', async (req, res) => {

    const { name, descr, quantidade, valor } = req.body;
    // verify if exist
    var product = await Produtos.findOne({ no_produto: name });
    
    if ( !product || product==""){
      return res.status(400).json({ msg: "Produto nao localizado" });
    }
      
    const productNew = await Produtos.updateOne({_id: product._id}, {$set: {ds_produto:descr, qt_estoque:quantidade, vl_valor:valor}});
  
    var productResult = await Produtos.findOne({ no_produto: name });

    console.log(productResult)
    res.status(200).json({ productResult });
  })

app.post('/produtos/compra', checkToken, async (req, res) => {

  const authHeader = req.headers["authorization"];
  const token = authHeader;
  const decodedjwt = jwt.decode(token)
  var user = await Users.findOne({ tx_email: decodedjwt.tx_email });
  console.log(user)
  const { name } = req.body;
  // verify if exist
  var product = await Produtos.findOne({ no_produto: name });
  
  if ( !product || product==""){
    return res.status(400).json({ msg: "Produto nao localizado" });
  }

  if ( product.qt_estoque <= 0 ){
    return res.status(400).json({ msg: "Produto fora de estoque" });
  }

  if ( product.vl_valor > user.vl_saldo ){
    return res.status(400).json({ msg: "Saldo insuficiente" });
  }
  var novoSaldo = user.vl_saldo - product.vl_valor
  var novoEstoque = product.qt_estoque - 1
  
  const resultSaldo = await Users.updateOne({_id: user._id}, {$set: {vl_saldo:novoSaldo}});
  const resultEstoque = await Produtos.updateOne({_id: product._id}, {$set: {qt_estoque:novoEstoque}});

  user = await Users.findOne({ tx_email: decodedjwt.tx_email });
  console.log(resultSaldo)

  res.status(200).json({ user });
})

mongoose.connect('mongodb://127.0.0.1:27017/usuarios') .then(() => {
  console.log("Conectou ao banco!");
  app.listen(port, () => {
    console.log(`API de Autenticacao na porta: ${port}`)
  })    
})
.catch((err) => console.log(err));