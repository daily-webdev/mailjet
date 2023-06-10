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
  res.send("Backend dostępny tylko poprzez stronę E-CV");
});

// MAILJET
async function sendMail(name, email, subject, message) {
  try {
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

    const send = await axios(config);
    return send;
  } catch (error) {
    throw error;
  }
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
  const { success, "error-codes": errorCodes } = googleRes.data;
  if (success) {
    return true;
  } else {
    return false;
  }
}

const trustedDomain = "e-cv-mauve.vercel.app";
const checkDomain = (req, res, next) => {
  const referer = req.get("Referer");
  if (referer && referer.includes(trustedDomain)) {
    next();
  } else {
    res.status(403).send("Brak dostępu");
  }
};

// MAILJET ROUTE

app.post("/sendemail", checkDomain, (req, res) => {
  const { name, email, subject, message, tokenValue } = req.body;

  verifyToken(tokenValue)
    .then((result) => {
      if (result) {
        sendMail(name, email, subject, message)
          .then(() => {
            res.send(JSON.stringify("zweryfikowano"));
          })
          .catch((error) => {
            res.send(JSON.stringify(error));
          });
      } else {
        res.send(JSON.stringify("nie zweryfikowano"));
      }
    })
    .catch((err) => {
      res.send(JSON.stringify("błąd weryfikacji"));
    });
});

// app.use((err, req, res, next) => {
//   console.error(err);
//   res.status(500).send("Wystąpił błąd serwera.");
// });

// LISTEN
app.set("port", port);
const server = http.createServer(app);
server.listen(port);
