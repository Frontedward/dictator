---
slug: bun-review
title: Краткий обзор Bun — новой среды выполнения JavaScript
description: Краткий обзор Bun — новой среды выполнения JavaScript
authors: harryheman
tags: [javascript, js, typescript, ts, bun, node.js, nodejs, runtime, engine]
---

Привет, друзья!

В этой статья я немного расскажу вам о [Bun](https://bun.sh/) - новой среде выполнения JavaScript-кода.

_Обратите внимание_: Bun - это экспериментальная штуковина, поэтому использовать ее для разработки производственных приложений пока не рекомендуется.

К слову, [в рейтинге "Восходящие звезды JavaScript 2022" Bun стал победителем в номинации "Самые популярные проекты"](https://risingstars.js.org/2022/en#section-all).

<!--truncate-->

## Что такое Bun?

Bun - это современная среда выполнения JS типа [Node.js](https://nodejs.org/) или [Deno](https://deno.land/) со встроенной поддержкой [JSX](https://ru.reactjs.org/docs/introducing-jsx.html) и [TypeScript](https://www.typescriptlang.org/). Она разрабатывалась с акцентом на трех вещах:

- быстрый запуск;
- высокая производительность;
- самодостаточность.

Bun включает в себя следующее:

- реализацию веб-интерфейсов вроде [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) и [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream);
- реализацию алгоритма разрешения `node_modules`, что позволяет использовать пакеты [npm](https://www.npmjs.com/) в Bun-проектах. Bun поддерживает как ES, так и CommonJS-модули (сам Bun использует ESM);
- встроенную поддержку JSX и TS;
- встроенную поддержку `"paths"`, `"jsxImportSource"` и других полей из файла `tsconfig.json`;
- API `Bun.Transpiler` - транспилятора JSX и TS;
- `Bun.write` для записи, копирования и отправки файлов с помощью самых быстрых из доступных возможностей файловой системы;
- автоматическую загрузку переменных среды окружения из файла `.env`;
- встроенного клиента [SQLite3](https://www.sqlite.org/releaselog/3_40_1.html) (`bun:sqlite`);
- реализацию большинства интерфейсов Node.js, таких как [fs](https://nodejs.org/api/fs.html), [path](https://nodejs.org/api/path.html) и [Buffer](https://nodejs.org/api/buffer.html);
- интерфейс внешней функции с низкими накладными расходами `bun:ffi` для вызова нативного кода из JS.

Bun использует движок [JavaScriptCore](https://github.com/WebKit/WebKit/tree/main/Source/JavaScriptCore), разрабатываемый WebKit, который запускается и выполняет операции немного быстрее, а также использует память немного эффективнее, чем классические движки типа [V8](https://v8.dev/). Bun написан на [Zig](https://ziglang.org/) - языке программирования низкого уровня с ручным управлением памятью, чем объясняются высокие показатели его скорости.

Большая часть составляющих Bun была реализована с нуля.

Таким образом, Bun это:

- среда выполнения клиентского и серверного JS;
- транспилятор JS/JSX/TS;
- сборщик JS/CSS;
- таскраннер (task runner) для скриптов, определенных в файле `package.json`;
- совместимый с npm менеджер пакетов.

Впечатляет, не правда ли?

## Примеры использования Bun

Рассмотрим несколько примеров использования Bun для разработки серверных и клиентских приложений.

Начнем с установки.

__Установка__

Для установки Bun достаточно открыть терминал и выполнить следующую команду:

```bash
curl -fsSL https://bun.sh/install | bash
```

_Обратите внимание_: для установки Bun в Windows требуется [WSL](https://learn.microsoft.com/ru-ru/windows/wsl/install) (Windows Subsystem for Linux - подсистема Windows для Linux). Для ее установки необходимо открыть PowerShell в режиме администратора и выполнить команду `wsl --install`, после чего - перезагрузить систему и дождаться установки [Ubuntu](https://ubuntu.com/). После установки Ubuntu открываем приложение wsl и выполняем команду для установки Bun.

Проверить корректность установки (версию) Bun можно с помощью команды `bun --version` (в моем случае - это `0.4.0`).

__Чтение файла__

Создаем директорию `bun`, переходим в нее и создаем файлы `hello.txt` и `cat.js`:

```bash
mkdir bun
cd ./bun
touch hello.txt cat.js
```

Редактируем `hello.txt`:

```txt
Всем привет! ;)

```

Редактируем `cat.js`:

```javascript
// модули Node.js
import { resolve } from 'node:path'
import { access } from 'node:fs/promises'
// модули Bun
import { write, stdout, file, argv } from 'bun'

// читаем путь из ввода
// bun ./cat.js [path-to-file]
const filePath = resolve(argv.at(-1))

let fileContent = 'Файл не найден\n'

// если при доступе к файлу возникла ошибка,
// значит, файл отсутствует
try {
  await access(filePath)
  // file(path) возвращает `Blob`
  // https://developer.mozilla.org/en-US/docs/Web/API/Blob
  fileContent = file(filePath)
} catch {}

await write(
  // стандартным устройством вывода является терминал,
  // в котором выполняется команда
  stdout,
  fileContent
)
```

Выполняем команду `bun ./cat.js ./hello.txt`:

<img src="https://habrastorage.org/webt/ef/ak/er/efakerx-_xcicx3e2x4xbcvpako.png" />
<br />

Выполняем команду `bun ./cat.js ./hell.txt`:

<img src="https://habrastorage.org/webt/ps/dw/zb/psdwzbqzq9pyc_nwbliafxj9dvg.png" />
<br />

__HTTP-сервер__

Создаем файлы `index.html` и `http.js`:

```bash
mkdir bun
cd ./bun
touch index.html http.js
```

Редактируем `index.html`:

```html
<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Страница приветствия</title>
  </head>
  <body>
    <h1>Всем привет! 👋</h1>
  </body>
</html>
```

Редактируем `http.js`:

```javascript
import { resolve } from 'node:path'
import { file } from 'bun'

// адрес страницы приветствия
const INDEX_URL = 'http://localhost:3000/'

// путь к файлу `index.html`
const filePath = resolve(process.cwd(), './index.html')
// содержимое `index.html`
const fileContent = file(filePath)

export default {
  // порт
  // дефолтный, можно не указывать явно
  port: 3000,
  // обработчик запросов
  fetch(request) {
    console.log(request)

    // если запрашивается страница приветствия
    if (request.url === INDEX_URL) {
      // возвращаем `index.html`
      return new Response(fileContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        }
      })
    }

    // иначе возвращаем такой ответ
    return new Response('Запрашиваемая страница отсутствует', {
      status: 404
    })
  }
}
```

Выполняем команду `bun ./http.js` для запуска сервера и переходим по адресу `http://localhost:3000`:

<img src="https://habrastorage.org/webt/bp/w1/hi/bpw1hilyptfam2tayje3ikuhheo.png" />
<br />

Пробуем перейти по другому адресу, например, `http://localhost:3000/test`:

<img src="https://habrastorage.org/webt/gw/cy/hs/gwcyhsamkaegtipbyw0okbmcjq4.png" />
<br />

Объекты выполненных нами запросов выглядят следующим образом:

<img src="https://habrastorage.org/webt/sz/pu/ej/szpuejxqjw6sixy8hzczgsnobzg.png" />
<br />

__Чат__

Создаем файлы `ws.html` и `ws.js`:

```bash
touch ws.html ws.js
```

Редактируем `ws.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Чат</title>
    <style>
      .msg-form {
        display: none;
      }
    </style>
  </head>
  <body>
    <main>
      <form class="name-form">
        <label>Имя: <input type="text" required autofocus /></label>
        <button>Подключиться</button>
      </form>
      <form class="msg-form">
        <label>Сообщение: <input type="text" required /></label>
        <button>Отправить</button>
      </form>
      <ul></ul>
    </main>

    <script>
      // ссылки на формы, инпуты и список
      const main = document.querySelector('main')
      const nameForm = main.querySelector('.name-form')
      const nameInput = nameForm.querySelector('input')
      const msgForm = main.querySelector('.msg-form')
      const msgInput = msgForm.querySelector('input')
      const msgList = main.querySelector('ul')

      // переменная для сокета
      let ws

      // обработка отправки формы для имени
      nameForm.addEventListener(
        'submit',
        (e) => {
          e.preventDefault()
          const name = nameInput.value
          // открываем соединение
          // имя передается в качестве параметра строки запроса
          ws = new WebSocket(`ws://localhost:3000?name=${name}`)
          ws.onopen = () => {
            console.log('Соединение установлено')
            // регистрируем обработчик сообщений
            ws.onmessage = (e) => {
              // добавляем элемент в конец списка
              const msgTemplate = `<li>${e.data}</li>`
              msgList.insertAdjacentHTML('beforeend', msgTemplate)
            }
          }
          nameForm.style.display = 'none'
          msgForm.style.display = 'block'
          msgInput.focus()
        },
        { once: true }
      )
      // обработка отправки формы для сообщения
      msgForm.addEventListener('submit', (e) => {
        // проверяем, что соединение установлено
        if (ws.readyState !== 1) return
        e.preventDefault()
        const msg = msgInput.value
        // отправляем сообщение
        ws.send(msg)
        msgInput.value = ''
      })
    </script>
  </body>
</html>
```

Редактируем `ws.js`:

```javascript
export default {
  fetch(req, server) {
    if (
      server.upgrade(req, {
        // этот объект доступен через `ws.data`
        data: {
          name: new URL(req.url).searchParams.get('name') || 'Friend'
        }
      })
    )
      return

    return new Response('Ожидается ws-соединение', { status: 400 })
  },

  websocket: {
    // обработка подключения
    open(ws) {
      console.log('Соединение установлено')

      // подписка на `chat`
      ws.subscribe('chat')
      // сообщаем о подключении нового пользователя всем подключенным пользователям
      ws.publish('chat', `${ws.data.name} присоединился к чату`)
    },

    // обработка сообщения
    message(ws, message) {
      // передаем сообщение всем подключенным пользователям
      ws.publish('chat', `${ws.data.name}: ${message}`)
    },

    // обработка отключения
    close(ws, code, reason) {
      // сообщаем об отключении пользователя
      ws.publish('chat', `${ws.data.name} покинул чат`)
    },

    // сжатие
    perMessageDeflate: true
  }
}
```

Выполняем команду `bun --hot ./ws.js` для запуска сервера. Флаг `--hot` указывает Bun перезапускать сервер при изменении `ws.js` (что-то типа [nodemon](https://www.npmjs.com/package/nodemon) для Node.js, работает не очень стабильно).

Открываем `ws.html` в 2 вкладках браузера, подключаемся к серверу и переписываемся:

<img src="https://habrastorage.org/webt/ys/ui/b8/ysuib8xxddg50qwn9wuh643nw1e.png" />
<br />

__Сравнение производительности Node.js и Bun__

Создаем файл `test.js` следующего содержания:

```javascript
console.time('test')
for (let i = 0; i < 10000; i++) console.log(i)
console.timeEnd('test')
```

Для чистоты эксперимента я установил Node.js 18 версии в wsl с помощью команды `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`.

Выполнение кода `test.js` с помощью Bun занимает `15-30 мс`:

<img src="https://habrastorage.org/webt/zj/f_/mu/zjf_mubxwpjjcv-ktp7carpprr4.png" />
<br />

А с помощью Node.js - `115-125 мс`:

<img src="https://habrastorage.org/webt/rp/uo/un/rpuounc2wzqska52s9tcetce2wo.png" />
<br />

Кажется, что вывод о более высокой производительности Bun по сравнению с Node.js очевиден, но давайте не будем спешить.

Перепишем код `test.js` следующим образом:

```javascript
// 10 раз вычисляем факториал числа 10
// и получаем среднее время выполнения операций
const diffArr = []
for (let i = 0; i < 10; i++) {
  const now = performance.now()
  const factorial = (n) => (n ? n * factorial(n - 1) : 1)
  factorial(10)
  const diff = performance.now() - now
  diffArr.push(diff)
}
const avg = diffArr.reduce((a, b) => a + b, 0) / diffArr.length
console.log(avg)
```

Выполнение этого кода с помощью Bun занимает в среднем `0,025 мс`:

<img src="https://habrastorage.org/webt/ba/8n/6h/ba8n6hlf0zlbuk7wbw78z21uaku.png" />
<br />

А с помощью Node.js - `0,002 мс`:

<img src="https://habrastorage.org/webt/te/lu/o2/teluo2iqq22v9c7detecztficu4.png" />
<br />

Получается, что при работе с выводом (stdout) Bun производительнее Node.js в 7 раз (`115 / 15 = 7,66...`), а при выполнении вычислительных операций (по крайней мере, когда речь идет о рекурсии) Node.js производительнее Bun в 12 раз (`0,025 / 0,002 = 12.5`) (я что-то делаю не так? Поделитесь своим мнением на этот счет в комментариях).

__Создание шаблона React-приложения__

Теперь поговорим об использовании Bun для разработки клиентских приложений.

В настоящее время Bun предоставляет только один готовый шаблон - для [React](https://ru.reactjs.org/). На подходе [шаблон для Next.js](https://github.com/oven-sh/bun#using-bun-with-nextjs), но там еще много всего не реализовано. Bun также можно использовать [с SPA на чистом JS](https://github.com/oven-sh/bun#using-bun-with-single-page-apps).

Для создания шаблона React-приложения с помощью Bun достаточно выполнить следующую команду:

```bash
# app-name - название приложения/директории
bun create react [app-name]
```

Создаем проект `react-app-bun`:

```bash
bun create react react-app-bun
```

Выполнение этой операции занимает `10,6 сек`:

<img src="https://habrastorage.org/webt/pv/3z/u6/pv3zu63dkyvnk3k0rdfyhz8pti0.png" />
<br />

Для сравнения, создание проекта с помощью [Create React App](https://create-react-app.dev/) (`npx create-react-app react-app-cra`) занимает `больше 2 мин`:

<img src="https://habrastorage.org/webt/pp/hj/_b/pphj_bfgeckd6vcd2ahpeur2itm.png" />
<br />

Однако [Vite](https://vitejs.dev/) демонстрирует очень близкий показатель скорости:

```bash
yarn create vite react-app-vite --template vanilla && \
cd ./react-app-vite && \
yarn
```

[Yarn](https://yarnpkg.com/) идет в комплекте с Node.js и npm.

Команда `yarn create vite` создаст директорию с файлами без установки зависимостей.

<img src="https://habrastorage.org/webt/qm/kx/jb/qmkxjb-jjhog9ztif_pkad_0hvk.png" />
<br />

Переходим в директорию `react-app-bun` и запускаем сервер для разработки:

```bash
cd ./react-app-bun
bun dev
```

Запуск происходит практически мгновенно. Справедливости ради следует отметить, что запуск сервера для разработки с помощью Vite также происходит очень быстро, чего не скажешь о CRA.

Для добавления npm-пакетов используется команда `bun install` или `bun add` (для установки зависимостей для разработки используется флаг `--development` или `-d`), для удаления - `bun remove`.

Для выполнения команд, определенных в разделе `scripts` файла `package.json` используется команда `bun run [command-name]` (`run` можно опустить).

Что касается TS, то в настоящее время типы для Bun находятся в пакете [bun-types](https://www.npmjs.com/package/bun-types):

```bash
bun add -d bun-types
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["bun-types"]
  }
}
```

Пожалуй, это все, что я хотел рассказать вам о Bun.

На мой взгляд, основным преимуществом Bun является то, что он объединяет в себе целую кучу инструментов, которые используются для разработки современных веб-приложений, и при этом демонстрирует очень высокие показатели скорости. Поэтому я буду с нетерпением ждать релиза его стабильной версии.

Надеюсь, вы узнали что-то новое и не зря потратили время.

Благодарю за внимание и happy coding!
