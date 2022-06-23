const mongoose = require('mongoose')

const Produtos = mongoose.model('Produtos', {
  no_produto: String,
  ds_produto: String,
  qt_estoque: String,
  vl_valor: Number,
  }
)

module.exports = Produtos