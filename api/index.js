const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const port = process.env.PORT || "9000";
const app = express();
const axios = require("axios");
const { mailjetU, mailjetP, captchaSK } = require("./process");

// MIDDLEWARES
app.use(cors());
app.use(express.json());
// app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
// app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

// ROUTES
app.get("/", (req, res) => {
  res.send("welcome");
});

// MAILJET
async function sendMail(name, email, subject, message) {
  const data = JSON.stringify({
    Messages: [
      {
        // wiadomość do mnie
        From: { Email: "taublermarcin@gmail.com", Name: name },
        To: [{ Email: "taublermarcin@gmail.com", Name: "Marcin Taubler" }],
        Subject: subject,
        TextPart: message,
      },
      {
        // wiadomość do klienta
        From: { Email: "taublermarcin@gmail.com", Name: "Marcin Taubler" },
        To: [{ Email: email, Name: name }],
        Subject: `Potwierdzenie wysłania: ${subject}`,
        TextPart: `Przekazana została wiadomość o treści: ${message}`,
      },
    ],
  });

  const config = {
    method: "post",
    url: "https://api.mailjet.com/v3.1/send",
    data: data,
    headers: { "Content-Type": "application/json" },
    auth: {
      username: mailjetU,
      password: mailjetP,
    },
  };

  return axios(config);
}

// RECAPTCHA
async function verifyToken(token) {
  const secretKey = captchaSK;
  const config = {
    method: "post",
    url: "https://www.google.com/recaptcha/api/siteverify",
    data: null,
    params: {
      secret: secretKey,
      response: token,
    },
  };
  const googleRes = await axios(config);
  const { success, score } = googleRes.data;
  if (success) {
    return true;
  } else {
    return false;
  }
}

// MAILJET ROUTE
app.post("/sendemail", (req, res) => {
  const { name, email, subject, message, token } = req.body;

  verifyToken(token)
    .then((result) => {
      if (result) {
        sendMail(name, email, subject, message);
        res.send(JSON.stringify("zweryfikowano"));
      } else {
        res.send(JSON.stringify("nie zweryfikowano"));
      }
    })
    .catch((err) => {
      res.send(JSON.stringify("błąd weryfikacji"));
    });
});

// LISTEN
app.set("port", port);
const server = http.createServer(app);
server.listen(port);
