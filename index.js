import axios from "axios";
import "dotenv/config";
import cheerio from "cheerio";
import * as ManageBacService from './services/ManageBacService'
const originUrl = "https://isnur-sultan.managebac.com";
import TelegramApi from 'node-telegram-bot-api'
import pgPool from './database/db'
import bcrypt from 'bcryptjs'
// TODO: add functionality for adding task details 
async function getDetailsFromTask(taskUrl) {
  const html = axios.get(taskUrl, {
    withCredentials: true,
    headers: {
      Cookie: myCookie,
    },
  }).data;
  const $ = cheerio.load(html);
  const texts = [];
  const detailsElememt = $(".fix-body-margins", html);
  if (detailsElememt.length > 0) {
    detailsElememt.find("p").each(function () {
      texts.push($(this).text());
    });
  }
  return texts;
}

function validateEmail(email) {
  let regex = new RegExp('[a-z0-9]+@[a-z]+\.[a-z]{2,3}');
  return regex.test(email)
}

const startBot = () => {
  const bot = new TelegramApi(process.env.TELEGRAM_TOKEN, {polling: true})

  bot.setMyCommands([
    {command: '/start', description: 'Description of the bot'},
    {command: '/login', description: 'Authorize to ManageBac'},
    {command: '/tasks', description: 'Get upcoming tasks'},
  ])
  
  bot.on('message', msg=>{
    const text = msg.text;
    const chatId = msg.chat.id;
    if(text==='/start')
    {
      bot.sendMessage(chatId, `Hello ${msg.chat.first_name}! This is ManageBacBOT who sends your upcoming tasks without checking on the website.\nPress /login so that i'll get your homeworks and summatives`)
    }
    if(text==='/login')
    {
      bot.sendMessage(chatId, `Please, enter your ManageBac email`)
      bot.on('message', emailMessage=>{
        if(validateEmail(emailMessage.text))
        {
          bot.sendMessage(chatId, `Please, enter your ManageBac password. P.S Don't worry I'll hash it :)`)
          bot.on('message', async passwordMessage=>{
            const result = await ManageBacService.getServiceCookies(emailMessage.text, passwordMessage.text)
            if(result === -1)
            {
              'Error occured. Check credentials again and press /login'
            }
            else
            {
              const email = emailMessage.text
              const password = bcrypt.hashSync(passwordMessage.text, 7)
              bot.deleteMessage(msg.chat.id, passwordMessage.message_id)
              const result = await pgPool.query('INSERT INTO users (chat_id, email, password_hash) VALUES ($1, $2, $3) RETURNING *', msg.chat.id, email, password)
              console.log(JSON.stringify(result.rows))
            }
          })
        }
        bot.sendMessage(chatId, `Enter valid email :)`)
      })
    }
  })
}


startBot()