class apiController {

  async login (req, res) {
    try {
      const { login, password } = req.body
      res.status(200).json({login, password})
      
    } catch (err) {
      console.log(err);
      res.status(400).json({message: "Login Error"})
    }
  }

}

module.exports = new apiController()