const nodemailer = require('nodemailer')

class MailService {

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true, // use TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    })
  }

  async sendResetPasswordMail(userEmail, resetLink) {
    await this.transporter.sendMail({
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: "Password change",
      text: "",
      html: `
        <div>
          <h1>Change password for Segmentation service</h1>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>This link will work only for 15 minutes</p>
        </div>
      `
    })
  }

  async sendActivateAccountMail(userEmail, resetLink) {
    await this.transporter.sendMail({
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: "Activate account on Segmentation",
      text: "",
      html: `
        <div>
          <h1>Activate account for Segmentation service</h1>
          <p>Click on link to activate your account</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>This link will work only for 15 minutes</p>
        </div>
      `
    })
  }
}

module.exports = new MailService()
