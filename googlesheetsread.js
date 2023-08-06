// importing libs
const {google} = require('googleapis');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');

// importing env variables
require('dotenv').config();

// Авторизация с помощью ключа API
const authClient = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});


// Переменные

// Telegram stuff
const BOT_TOKEN = process.env.BOT_TOKEN; // токен
const CHANNEL_ID = process.env.CHANNEL_ID; // ID канала
const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID; // ID канала
// ID вашей таблицы
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
// объект для трансляции часов в колонку док-та
const columnByHour = {
    8: 'A',
    9: 'B',
    10: 'C',
    11: 'D',
    12: 'E',
    13: 'F',
    14: 'J',
    15: 'H',
    16: 'I',
    17: 'J',
    18: 'K',
    19: 'L',
    20: 'M',
    21: 'N',
}

// Создаем экземпляры

// Создаем клиента для работы с Google Sheets API
const sheets = google.sheets({version: 'v4', auth: authClient});
// Создаем экземпляр бота
const bot = new TelegramBot(BOT_TOKEN, {polling: false});


// Функции

// Читаем из таблицы страницу/столбик
async function readColumn(sheetName, columnName) {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!${columnName}:${columnName}`,
        });

        const columnData = response.data.values;
        if (columnData.length) {
            return columnData;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Ошибка при чтении данных:', error.message); // добавить отправку сообщения об ошибки в группу админов
        return false;
    }
}

// Функция для получения номера недели
function getWeekNumber() {
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), 0, 1);
    return Math.ceil((Math.floor((currentDate - startDate) /
        (24 * 60 * 60 * 1000))) / 7);
}

// Функция отправить изображения в канал
async function sendPics(channelID, picsArr) {

    const media = picsArr.map((imageUrl) => ({
        type: 'photo',
        media: imageUrl,
    }));

    await bot.sendMediaGroup(CHANNEL_ID, media)
        .then(() => {
            console.log('Группа изображений отправлена в канал.');
        })
        .catch((error) => {
            console.error('Ошибка при отправке группы изображений:', error);
        });
}

// Функция отправить сообщение в канал
async function sendMessage(channelID, messageHTML) {

    await bot.sendMessage(CHANNEL_ID, messageHTML, {parse_mode: 'HTML'})
        .then(() => {
            console.log('Текст отправлен в канал.');
        })
        .catch((error) => {
            console.error('Ошибка при отправке текста:', error);
            sendMessage(ADMIN_CHANNEL_ID, 'Произошла ошибка чтения из Google Sheet. Пост не выставлен!')
        });
}

async function main() {
    const now = new Date();
    const weekNumber = getWeekNumber();
    const hourNumber = now.getHours();
    const dayNumber = now.getDay();

    // Имя листа и столбца, который вы хотите прочитать (например, A, B, C и т.д.)
    // Измените на нужный столбец (например, 'B', 'C', и т.д.)
    const data = await readColumn(`${weekNumber}-${dayNumber}`, `${columnByHour[hourNumber]}`);
    console.log('********************************************************************');
    console.log(`Reading the folder ${weekNumber}-${dayNumber}, column ${columnByHour[hourNumber]}`);
    console.log('********************************************************************');

    if (data === false) {
        await sendMessage(ADMIN_CHANNEL_ID, 'Произошла ошибка чтения из Google Sheet. Пост не выставлен!')
    } else {
        const caption = data[1][0];
        const media = data.splice(2).filter((link) => {
            if (link[0].match(/(?:https?|ftp):\/\/[^\s/$.?#].[^\s]*/g)) {
                return link;
            }
        });
        // const media = data.splice(2);
        await sendPics(CHANNEL_ID, media.flat());
        await sendMessage(CHANNEL_ID, caption);
        console.log('Пост выставлен');
        console.log('********************************************************************');
    }
}

cron.schedule('0 8-21 * * *', main);