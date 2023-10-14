---
slug: nextjs-redis
title: Кэшируем страницы с помощью кастомного сервера Next.js и Redis
description: Туториал по кэшированию страниц с помощью кастомного сервера Next.js и Redis
authors: harryheman
tags: [next.js, nextjs, custom server, redis, page caching]
---

Привет, друзья!

В одной из [предыдущих статей](https://habr.com/ru/company/timeweb/blog/655775/) я рассказывал об оптимизации изображений с помощью [Imgproxy](https://docs.imgproxy.net/GETTING_STARTED) и их кешировании на клиенте с помощью [сервис-воркера](https://developer.mozilla.org/ru/docs/Web/API/Service_Worker_API). В этой статье я хочу рассказать вам о кешировании разметки, генерируемой [Next.js](https://nextjs.org/), с помощью [кастомного сервера](https://nextjs.org/docs/advanced-features/custom-server) и [Redis](https://redis.io/), а также показать один простой прием, позволяющий существенно ускорить серверный рендеринг определенных страниц.

> [Репозиторий с кодом проекта](https://github.com/harryheman/Blog-Posts/tree/master/nextjs-redis).

<!--truncate-->

## Подготовка и настройка проекта

_Обратите внимание_: для успешного прохождения туториала на вашей машине должны быть установлены [Node.js](https://nodejs.org/en/download/) и [Docker](https://www.docker.com/products/docker-desktop/).

Создаем шаблон приложения с помощью [create-next-app](https://nextjs.org/docs/api-reference/create-next-app):

```bash
# next-redis - название проекта
yarn create next-app next-redis
# or
npx create-next-app next-redis
```

Переходим в созданную директорию и устанавливаем несколько дополнительных зависимостей:

```bash
yarn add cron dotenv express redis

yarn add -D nodemon
# or
npm i ...
npm i -D nodemon
```

- [cron](https://www.npmjs.com/package/cron) - утилита для выполнения отложенных и периодических задач;
- [dotenv](https://www.npmjs.com/package/dotenv) - утилита для доступа к переменным среды окружения;
- [express](https://expressjs.com/ru/) - `Node.js-фреймворк` для разработки веб-серверов;
- [redis](https://www.npmjs.com/package/redis) - библиотека для работы с `Redis`;
- [nodemon](https://www.npmjs.com/package/nodemon) - утилита для запуска сервера для разработки.

Создаем в корневой директории файл `.env` следующего содержания:

```bash
# название приложения
APP_NAME=my-app

# дефолтная среда разработки
ENV=development

# версия `Node.js`
NODE_VERSION=16.13.1

# пароль для доступа к `redis`
REDIS_PASSWORD=qwerty

# код подтверждения, который мы будем использовать для очистки кеша, хранящегося в `redis`
VERIFICATION_CODE=super-secret
```

Настроим `Docker-сервис` для `redis`.

Создаем в корневой директории файл `docker-compose.yml` следующего содержания:

```yml
# версия `Compose`
version: '3.9'
# сервисы приложения
services:
  # название сервиса
  redis:
    # файл, содержащий переменные среды окружения
    env_file: .env
    # название контейнера
    container_name: ${APP_NAME}_redis
    # используемый образ
    image: bitnami/redis:latest
    # том для хранения данных
    volumes:
      - ./data_redis:/data
    # порты `хост:контейнер`
    ports:
      - 6379:6379
    # политика перезапуска контейнера
    restart: on-failure
```

Выполняем команду `docker compose up -d` для запуска сервиса.

<img src="https://habrastorage.org/webt/iq/qz/nd/iqqzndfu5-gdm1xvn6hsyrenfxq.png" alt="" />
<br />

Получаем сообщение от `redis` о его готовности к работе.

На этом подготовка и настройка проекта завершены.

Переходим к разработке клиентской части приложения.

## Клиентская часть приложения

Клиентская часть нашего приложения будет максимально простой:

```
components - компоненты
  Nav.js - панель навигации
pages - страницы
  _app.js - основной компонент приложения
  about.js
  catalog.js
  index.js
public
  favicon.ico
styles
  global.css
```

`components/Nav.js`:

```javascript
/* eslint-disable */
export default function Nav() {
  return (
    <nav>
      <ul>
        <li>
          <a href='/'>Home</a>
        </li>
        <li>
          <a href='/catalog'>Catalog</a>
        </li>
        <li>
          <a href='/about'>About</a>
        </li>
      </ul>
    </nav>
  )
}
```

О том, почему в данном случае мы используем тег `a`, а не компонент `Link` из пакета `next/link`, см. ниже.

`pages/index.js`:

```javascript
export default function Home() {
  return <h2>Welcome to Home Page</h2>
}
```

`pages/about.js`:

```javascript
export default function Home() {
  return <h2>This is About Page</h2>
}
```

Эти страницы являются статическими (dumb/глупыми в терминологии [React](https://ru.reactjs.org/)).

`pages/catalog.js`:

```javascript
// адрес сервера
const SERVER_URI = process.env.SERVER_URI || 'http://localhost:5000'

// наличие функции `getServerSideProps` указывает на
// серверный рендеринг данной страницы
//
// мы хотим получать от сервера список/массив категорий
export async function getServerSideProps() {
  let categories = []

  try {
    const res = await fetch(`${SERVER_URI}/current-categories`)
    categories = await res.json()
  } catch (err) {
    console.error(err)
  }

  return {
    props: {
       categories
    }
  }
}

export default function Catalog({ categories }) {
  return (
    <>
      <h2>This is Catalog Page</h2>
      {/* рендерим категории, полученные от сервера */}
      <ul>
        {categories.map((category) => (
          <li key={category.id}>{category.title}</li>
        ))}
      </ul>
    </>
  )
}
```

Эта страница рендерится на сервере при каждом запросе. Что это означает?

На самом высоком уровне это означает следующее:

- при переходе на данную страницу клиент отправляет серверу `next` запрос на получение разметки в виде строки;
- сервер выполняет код функции `getServerSideProps` для получения необходимых для формирования разметки данных;
- сервер рендерит страницу (с помощью метода `renderToHtml`);
- готовая разметка возвращается клиенту в виде строки;
- клиент выполняет гидратацию/гидрацию (hydration), преобразуя строку в "настоящую" разметку.

`pages/_app.js`:

```javascript
import '../styles/globals.css'
import Nav from '../components/Nav'

function MyApp({ Component, pageProps }) {
  return (
    <div className='app'>
      <header>
        <h1>Next.js + Redis</h1>
        <Nav />
      </header>
      <main>
        <Component {...pageProps} />
      </main>
      <footer>
        <p>&copy; 2022. Not all rights reserved</p>
      </footer>
    </div>
  )
}

export default MyApp
```

Без комментариев.

Минимальные глобальные стили (`global.css`):

```css
html,
body {
  padding: 0;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
    Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
}

* {
  box-sizing: border-box;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  text-align: center;
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

a {
  text-decoration: none;
}

main {
  flex-grow: 1;
  display: grid;
  place-content: center;
}
```

На этом разработка клиентской части нашего приложения завершена.

Переходим к серверной части, ради которой мы, собственно, здесь и собрались.

## Серверная часть приложения

Серверная часть нашего приложения будет немного сложнее, чем клиентская:

```
server
  utils - утилиты
    pageController.js - контроллер страниц, посредник/middleware для взаимодействия с `redis`
    renderPage.js - утилита для рендеринга страниц
  index.js - основной файл сервера
```

Начнем с утилит.

`utils/renderPage.js`:

```javascript
async function renderPage(app, req, res) {
  // объединяем параметры и строку запроса из объекта запроса
  const query = { ...req.params, ...req.query }

  try {
    // рендерим страницу
    const html = await app.renderToHTML(req, res, req.path, query)

    // записываем ее в `redis`
    // данный метод добавляется в объект ответа соответствующим посредником
    res.saveHtmlToCache(html)

    // и возвращаем клиенту
    res.send(html)
  } catch (err) {
    console.error(err)

    // рендерим дефолтную страницу ошибки
    await app.renderError(err, req, res, req.path, query)
  }
}

module.exports = renderPage
```

`utils/pageController.js`.

Импортируем библиотеку для взаимодействия с `redis`, получаем доступ к переменным среды окружения, формируем `url` для доступа к серверу `redis` и определяем функцию для создания клиента `redis`

```javascript
const redis = require('redis')
require('dotenv').config()

const redisConfig = {
  // обратите внимание на символ `:` после `//`
  // без него будет выброшено исключение `invalid user-password pair`
  url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST || 'localhost'}:6379`
}

async function createClient() {
  // создаем клиента `redis`
  const client = redis.createClient(redisConfig)

  // регистрируем обработчики
  client.on('error', (err) => {
    console.error('@redis error', err)
  })

  client.on('connect', () => {
    console.log('@redis connect')
  })

  client.on('reconnecting', () => {
    console.log('@redis reconnecting')
  })

  client.on('end', () => {
    console.log('@redis disconnect')
  })

  try {
    // выполняем подключение к серверу `redis`
    await client.connect()
  } catch (err) {
    console.error(err)
  }

  // и возвращаем клиента
  return client
}
```

Определяем переменную для клиента `redis` и соответствующего посредника:

```javascript
let redisClient

async function pageController(req, res, next) {
  // создаем клиента `redis` при отсутствии
  if (!redisClient) {
    try {
      redisClient = await createClient()
    } catch (err) {
      console.error(err)
    }
  }

  console.log('@redis middleware', req.path)

  // ключ для кеша
  const cacheKey = req.path

  try {
    // пытаемся получить разметку из кеша
    const html = await redisClient.get(cacheKey)

    // если получилось
    if (html) {
      console.log('@from cache')

      // возвращаем разметку клиенту
      // на этом обработка запроса завершается,
      // соответствующий обработчик запроса не вызывается
      return res.send(html)
    }

    // расширяем объект ответа функцией для записи разметки в кеш
    res.saveHtmlToCache = (html) => {
      console.log('@to cache')

      redisClient.set(cacheKey, html).catch(console.error)
    }

    // расширяем объект ответа функцией для очистки кеша
    res.clearCache = () => {
      console.log('@clear cache')

      // в данном случае очищается весь кеш, хранящийся в `redis`
      // для удаления определенного кеша по ключу используется метод `redisClient.del(cacheKey)`
      redisClient.flushAll().catch(console.error)
    }

    // передаем управление обработчику запроса
    next()
  } catch (err) {
    console.error(err)
  }
}

module.exports = pageController
```

Теперь рассмотрим основной файл сервера (`index.js`).

Импортируем библиотеки и утилиты, определяем список/массив кешируемых страниц, определяем среду разработки, создаем экземпляр сервера `next` и обработчик запросов:

```javascript
const next = require('next')
const express = require('express')

const pageController = require('./utils/pageController')
const renderPage = require('./utils/renderPage')

// кешируемые страницы
const CACHED_PAGES = ['/', '/catalog', '/about']

// среда разработки
const dev = process.env.ENV === 'development'

// экземпляр сервера
const app = next({ dev })

// обработчик запросов
const handle = app.getRequestHandler()
```

Выполняем перехват и обработку запросов:

```javascript
app.prepare().then(() => {
  // создаем экземпляр приложения `express`
  const server = express()

  // директория со статическими файлами
  server.use(express.static('static'))

  // запросы на получение статики
  server.get('/_next/*', handle)

  server.get('/favicon.ico', handle)

  // все остальные `GET-запросы`
  // проходят через посредника для взаимодействия с `redis`
  server.get('*', pageController, (req, res) => {
    console.log('@route handler', req.path)

    // если поступил запрос на очистку кеша
    if (req.path === '/clear-cache') {
      // проверяем, что в заголовке `x-verification-code` содержится код подтверждения `super-secret`
      // предполагается, что запрос приходит откуда-то извне
      // например, в одном из моих рабочих проектов такой запрос
      // приходит от "полноценного" сервера, реализованного на `Python`
      if (
        req.headers['x-verification-code'] &&
        req.headers['x-verification-code'] !== process.env.VERIFICATION_CODE
      ) {
        // если заголовок отсутствует или его значение не совпадает с `super-secret`
        return res.sendStatus(403)
      }

      // очищаем кеш
      res.clearCache()

      return res.sendStatus(200)
    }

    // если запрашивается кешируемая страница
    if (CACHED_PAGES.includes(req.path)) {
      // вызываем нашу утилиту
      return renderPage(app, req, res)
    }

    // остальные запросы обрабатываются по умолчанию
    return handle(req, res)
  })

  // определяем порт
  const port = process.env.PORT || 5000

  // запускаем сервер
  server.listen(port, (err) => {
    if (err) return console.error(err)

    console.log(`🚀 Server ready on port ${port}`)
  })
})
```

Определяем в разделе `scripts` файла `package.json` команды для запуска кастомного сервера `next` в режимах для разработки и продакшна:

```json
"start:dev": "ENV=development nodemon server/index.js",
"start": "ENV=production node server/index.js"
```

Запускаем приложение в режиме для разработки с помощью команды `yarn start:dev` или `npm run start:dev` и открываем вкладку браузера по адресу: `http://localhost:5000`.

<img src="https://habrastorage.org/webt/2i/lp/io/2ilpiofzfnki2pyaclmwkjmsths.png" alt="" />
<br />

_Обратите внимание_ на сообщения в терминале: мы видим, что запрос на получение главной страницы (`/`) проходит сначала через посредника для работы с `redis` (`@redis middleware /`), затем через обработчик запроса (`@route handler /`). Также мы получили сообщение от `redis` о записи страницы в кеш (`@to cache`).

Переходим на другую страницу, например, `About`.

<img src="https://habrastorage.org/webt/fi/wu/sj/fiwusj43cgunijmci16lovutki4.png" alt="" />
<br />

Получаем аналогичные сообщения для этой страницы.

Возвращаемся на главную.

<img src="https://habrastorage.org/webt/pe/2r/yx/pe2ryxyuya9f9fddczi7onbkkow.png" alt="" />
<br />

На этот раз запрос проходит только через посредника (`@redis middleware /`), а страница доставляется из кеша (`@from cache`). Прекрасно, это как раз то, к чему мы стремились.

Вернемся к тому, почему на клиенте мы использовали тег `a` вместо компонента `Link`. Дело в том, что при использовании `Link` маршрутизация будет выполняться только на клиенте, без обращения к серверу, поэтому при переходе, например, с `/` на `/about`, `/about` не будет кешироваться (страницы будут кешироваться либо при перезагрузке вкладки браузера, либо при прямом переходе на страницу). Вы можете сами в этом убедиться, заменив `a` на `Link` в файле `components/Nav.js`.

## Ускорение серверного рендеринга страниц

Одна из проблем рендеринга страницы на стороне сервера состоит в том, что такой рендеринг может занимать много времени в случае, когда, например, на странице с `getServerSideProps` запрашивается большое количество данных, хранящихся в базе.

В одном из рабочих проектов я столкнулся с тем, что при инициализации приложение в `_app.js` запрашивало от сервера огромное количество данных. Ответ на этот запрос занимал до `10` (sic) секунд. Все это время пользователь, впервые пришедший на сайт, любовался белым экраном и индикатором загрузки браузера (при повторном посещении сайта и большинства страниц такой проблемы не было благодаря кешированию на `next` и `python-серверах`). Сами понимаете, что такая ситуация меня, мягко говоря, не очень устраивала. При этом я не мог ограничить размер возвращаемых данных (например, с помощью `limit` и `offset`) без существенного изменения логики приложения или избавиться от большого количества вычисляемых свойств возвращаемого объекта (чтобы ускорить работу сервера по формированию ответа).

После нескольких экспериментов я пришел к следующему:

- запрашиваем данные при запуске сервера;
- возвращаем эти данные клиенту без обращения к БД;
- периодически обновляем данные (каждые 20 минут) для обеспечения их актуальности.

Реализуем это на примере категорий (`categories`) для страницы каталога товаров (`Catalog`, `catalog.js`). Для этого немного модифицируем кастомный сервер в файле `server/index.js`.

Импортируем утилиту для создания задач из библиотеки `cron`:

```javascript
const { CronJob } = require('cron')
```

Определяем дефолтные категории и глобальную переменную для категорий:

```javascript
const DEFAULT_CATEGORIES = [
  {
    id: 1,
    title: 'First category',
    products: []
  },
  {
    id: 2,
    title: 'Second category',
    products: []
  },
  {
    id: 3,
    title: 'Third category',
    products: []
  }
]

let allCategories = []
```

Определяем функцию для получения категорий и вызываем ее:

```javascript
async function updateCategories() {
  try {
    const categories = await Promise.resolve(DEFAULT_CATEGORIES)
    // записываем категории, якобы полученные из БД, в глобальную переменную
    allCategories = categories
  } catch (err) {
    console.error(err)
  }
}
updateCategories()
```

Определяем `cron-задачу` для обновления категорий каждые 20 минут:

```javascript
const cronJobForCategories = new CronJob(
  '0/20 * * * *',
  updateCategories,
  null,
  false,
  'Europe/Moscow'
)
```

Сигнатура конструктора `Cron`:

```javascript
constructor(cronTime, onTick, onComplete, start, timezone)
```

- `cron: string` - время в специальном формате ([онлайн-редактор](https://crontab.guru/)). В данном случае "работа" будет выполняться каждые 20 минут;
- `onTick: function` - функция, запускаемая при выполнении "работы";
- `onComplete: function?` - функция, запускаемая после выполнения работы (символ `?` означает, что параметр является опциональным);
- `start?: boolean` - индикатор запуска "работы" после создания;
- `timezone?: string` - временная зона и т.д. С полным списком параметров можно ознакомиться [здесь](https://www.npmjs.com/package/cron#api).

Наконец, запускаем выполнение "работы" после запуска сервера при условии, что приложение запущено в производственном режиме:

```javascript
server.listen(port, (err) => {
  if (err) return console.error(err)

  console.log(`🚀 Server ready on port ${port}`)
})

// !
if (!dev) {
  cronJobForCategories.start()
}
```

Отлично, данная задача нами также успешно решена.

Для полного счастья нам не хватает только "контейнеризации" `Next-приложения`. Давайте это исправим.

Создаем в корневой директории файл `Dockerfile` следующего содержания:

```dockerfile
# дефолтная версия `Node.js`
ARG NODE_VERSION=16.13.1

# образ
FROM node:${NODE_VERSION}

# рабочия директория
WORKDIR /app

# копируем указанные файлы в рабочую директорию
COPY package.json yarn.lock ./

# устанавливаем зависимости
RUN yarn

# копируем остальные файлы
COPY . .

# выполняем сборку приложения
RUN yarn build

# запускаем кастомный сервер в производственном режиме
CMD ["yarn", "start"]
```

Редактируем файл `docker-compose.yml`:

```yml
version: '3.9'
services:
  next:
    env_file: .env
    # это важно: название хоста `redis` должно совпадать с названием соответствующего сервиса
    environment:
      - REDIS_HOST=redis
    container_name: ${APP_NAME}_next
    # контекст сборки
    build: .
    ports:
      - 5000:5000
    restart: on-failure

  redis:
    env_file: .env
    container_name: ${APP_NAME}_redis
    image: bitnami/redis:latest
    volumes:
      - ./data_redis:/data
    ports:
      - 6379:6379
    restart: on-failure
```

Останавливаем и удаляем сервис:

```bash
docker compose stop
docker compose rm
```

Запускаем сервис с помощью `docker compose up -d`.

<img src="https://habrastorage.org/webt/xg/_z/g2/xg_zg2abwbsxc572yano3tcptuq.png" alt="" />
<br />

Отправляем `GET-запрос` к `http://localhost:5000/clear-cache` с заголовком `x-verification-code: super-secret` для очистки кеша, например, с помощью [Insomnia](https://insomnia.rest/download).

<img src="https://habrastorage.org/webt/5q/7y/sy/5q7ysyja0maxdvep0jbhogkch64.png" alt="" />
<br />

Получаем сообщение об очистке кеша от `redis` (`@clear cache`).

Проверяем работоспособность приложения.

<img src="https://habrastorage.org/webt/pm/xj/zh/pmxjzhzaaelo0_dtym_uo3-fdcs.png" alt="" />
<br />

Круто! Все работает, как ожидается.

_Обратите внимание_: в реальных приложениях страницы следует кешировать только в производственном режиме. Для этого можно использовать переменную `const isProd = process.env.ENV === 'production'`, например.

Благодарю за внимание и happy coding!