module.exports = {
  callConcierge: function(req, res) {
    return res.text(JSON.stringify(req, null, 2)).send();
  }
}
