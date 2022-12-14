import "dotenv/config";
import * as ManageBacService from "./services/ManageBacService";
import TelegramApi from "node-telegram-bot-api";
import pgPool from "./database/db";
import bcrypt from "bcryptjs";

function validateEmail(email) {
  let regex = new RegExp("[a-z0-9]+@[a-z]+.[a-z]{2,3}");
  return regex.test(email);
}

const startBot = () => {
  const bot = new TelegramApi(process.env.TELEGRAM_TOKEN, { polling: true });

  bot.setMyCommands([
    { command: "/start", description: "Description of the bot" },
    { command: "/login", description: "Authorize to ManageBac" },
    { command: "/upcoming", description: "Get upcoming tasks" },
    { command: "/logout", description: "Leave from ManageBac" },
    {command: '/stats', description: "Get your GPA, test results and general performance"}
  ])
  bot.onText(/\/start/, async msg=> {
    console.log(`${msg.chat.first_name} pressed /start.`)
    bot.sendMessage(msg.chat.id, `Hello ${msg.chat.first_name}! I am ManageBacBOT, who sends your upcoming tasks and saves your time:)
    \nPress /login for authorizing to ManageBac
    \nPress /upcoming to check upcoming assignments
    \nPress /stats to calculate your average performance results
    \nAlso, contact developer's email for any questions or ideas to implement: seitov_a@isa.nis.edu.kz`)
    bot.sendSticker(msg.chat.id, 'https://tgram.ru/wiki/stickers/img/HotCherry/gif/5.gif')
  })
  bot.onText(/\/login/, async msg => {
    const credentialsPrompt = await bot.sendMessage(msg.chat.id, "Enter your ManageBac email and password by space, please. Don't worry, I'll encrypt them :)", {
        reply_markup: {
            force_reply: true,
        },
    })
    bot.onReplyToMessage(msg.chat.id, credentialsPrompt.message_id, async (credentialsMessage) => {
      const credentials = credentialsMessage.text.trim().split(/\s+/);
      bot.deleteMessage(msg.chat.id, credentialsMessage.message_id)
      if(credentials.length !== 2 || !validateEmail(credentials[0]))
      {
        bot.sendMessage(msg.chat.id, 'Error occured. Check validity of your credentials, please. Press /login')
      }
      else
      {
        const checkIfExistsQuery = await pgPool.query('SELECT* FROM users where chat_id = $1', [msg.chat.id])
        if(checkIfExistsQuery.rows <= 0)
        {
          const email = credentials[0]
          const password = credentials[1]
          const password_hash = bcrypt.hashSync(password, 7)
          const result = await ManageBacService.getServiceCookies(email, password)
          if(result === false)
          {
            bot.sendMessage(msg.chat.id, 'Incorrect ManageBac credentials. Check validity of your credentials, please. Press /login')
          }
          if(typeof(result) === 'string')
          {
            try
            {
              const dbQueryResult = await pgPool.query('INSERT INTO users (chat_id, email, password_hash, cookie_str) VALUES ($1, $2, $3, $4) RETURNING *',
              [msg.chat.id, email, password_hash, result])
             bot.sendMessage(msg.chat.id, 'Good, you are in! Get your upcoming tasks by /upcoming')
            }catch(e)
            {
              console.log(e)
            }
          }
        }
        else
        {
          bot.sendMessage(msg.chat.id, 'You have already logged in. Want to logout? Press /logout')
        }
      }
    })
  })
  bot.onText(/\/logout/, async msg=>{
    const existingUser = await pgPool.query(`SELECT* FROM users where chat_id = $1`, [msg.chat.id])
    if(existingUser.rowCount <= 0)
      bot.sendMessage(msg.chat.id, 'You are not logged in to your account. Press /login to authorize')
    else
    {
      const deleteUserQuery = await pgPool.query('DELETE FROM users where chat_id = $1', [msg.chat.id])
      if(deleteUserQuery.rowCount>=0)
      {
        bot.sendMessage(msg.chat.id, 'Done. Good luck!')
      }
    } 
  })
  bot.onText(/\/upcoming/, async msg=> {
   const getUsersCookieQuery = await pgPool.query(`SELECT* FROM users where chat_id = $1`, [msg.chat.id])
   if(getUsersCookieQuery.rows.length > 0)
   {
    const upcomingTasks = await ManageBacService.getUpcomingTasks(getUsersCookieQuery.rows[0].cookie_str)
    for (let i = 0; i < upcomingTasks.length; i++) {
      const task = upcomingTasks[i];
      bot.sendMessage(msg.chat.id, `You have ${task.title} ${task.subject}.\n This is ${task.taskType}, which is due to ${task.dueDate}.\n Here is url of the task: ${task.url}`)
    }
   }
   else
   {
    bot.sendMessage(msg.chat.id, 'Authorize first, please. Press /login')
   }
  })
  bot.onText(/\/stats/, async msg=> {
    const getUsersCookieQuery = await pgPool.query(`SELECT* FROM users where chat_id = $1`, [msg.chat.id])
    if(getUsersCookieQuery.rows.length > 0)
    {
     const courseGrades = await ManageBacService.getCourseGrades(getUsersCookieQuery.rows[0].cookie_str)
     courseGrades.sort((a,b)=>{
      if ( a.grade < b.grade ){
        return 1;
      }
      if ( a.grade > b.grade ){
        return -1;
      }
      return 0;
     })
     let gradesMessage = ''
     let totalSumOfTheGrades = 0
     for (let i = 0; i < courseGrades.length; i++) {
       gradesMessage+=`Subject: ${courseGrades[i].name}\nMark percentage: ${courseGrades[i].grade}%\n\n`
       totalSumOfTheGrades+=courseGrades[i].grade
     }
     gradesMessage+=`\nAverage mark percentage: ${parseFloat(totalSumOfTheGrades/courseGrades.length).toFixed(2)}%`
     bot.sendMessage(msg.chat.id, gradesMessage)
    }
    else
    {
     bot.sendMessage(msg.chat.id, 'Authorize first, please. Press /login')
    }
  })
}
startBot();