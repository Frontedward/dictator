---
slug: two-snippets
title: Два интересных сниппета JavaScript
description: Рассмотрение двух интересных сниппетов JavaScript
authors: harryheman
tags: [javascript, js, reactivity, signal, race condition, request deduplication, snippet, реактивность, состояние гонки, дедуликация запросов, сниппет]
---

Hello, world!

В этой небольшой заметке я хочу поделиться с вами двумя сниппетами, которые показались мне очень интересными. Первый сниппет представляет собой пример реализации простой реактивности (signal), второй - способ предотвращения несогласованности данных в результате состояния гонки (race condition). Первая конструкция используется в [SolidJS](https://www.solidjs.com/) (с некоторыми дополнительными оптимизациями), вторая - заимствована из одного рабочего проекта.

<!--truncate-->

Начнем с сигнала.

Взгляните на следующий код:

```javascript
let currentListener

function createSignal(initialValue) {
  let value = initialValue
  const subscribers = new Set()

  const read = () => {
    if (currentListener) {
      subscribers.add(currentListener)
    }
    return value
  }

  const write = (newValue) => {
    value = newValue
    subscribers.forEach((fn) => fn())
  }

  return [read, write]
}

function createEffect(callback) {
  currentListener = callback
  callback()
  currentListener = null
}
```

Функция `createSignal` создает "реактивное" значение, а функция `createEffect` принимает коллбэк, который выполняется при изменении этого значения.

Пример использования данного сниппета:

<iframe height="300" width="100%" scrolling="no" title="signal" src="https://codepen.io/harryheman/embed/rNZRvxm?default-tab=html%2Cresult" frameborder="no" loading="lazy" allowtransparency="true" allowfullscreen="true">
  See the Pen <a href="https://codepen.io/harryheman/pen/rNZRvxm">
  signal</a> by Igor Agapov (<a href="https://codepen.io/harryheman">@harryheman</a>)
  on <a href="https://codepen.io">CodePen</a>.
</iframe>

```javascript
const [count, setCount] = createSignal(0)

const button = document.querySelector('button')

createEffect(() => {
  button.textContent = count()
})

button.addEventListener('click', () => {
  setCount(count() + 1)
})
```

При нажатии кнопки значение счетчика увеличивается на единицу. Это приводит к обновлению текста кнопки.

Таким образом, код работает, как ожидается. Но... почему? Как это работает? 😮

---

Давайте разбираться.

```javascript
const [count, setCount] = createSignal(0)
```

`count` и `setCount` - это, соответственно, функции чтения и записи (`read` и `write`) значения переменной `value` ("живущей" в замыкании (closure)), возвращаемые `createSignal()`. Значением `value` здесь становится `0`.

```javascript
createEffect(() => {
  button.textContent = count()
})
```

Это, пожалуй, самая хитрая строчка в коде.

- `createEffect()` записывает переданный коллбэк в переменную `currentListener`;
- `createEffect()` запускает коллбэк;
- `button.textContent = count()` выполняется справа налево;
- `count()` (`read()`) добавляет `currentListener` в набор `subscribers` (делает коллбэк подписчиком);
- `count()` возвращает значение `value`;
- значение `value` становится текстом кнопки;
- наконец, `createEffect()` очищает `currentListener`.

```javascript
button.addEventListener('click', () => {
  setCount(count() + 1)
})
```

Здесь нас интересует следующая строка:

```javascript
setCount(count() + 1)
```

Она также выполняется справа налево:

- `count()` (`read()`) возвращает значение `value` (на данном этапе `currentListener === null`, поэтому никаких коллбэков в `subscribers` не добавляется);
- `setCount(1 + 1)` (или `write(2)`) обновляет `value` значением `2`;
- `setCount()` запускает все коллбэки, содержащиеся в `subscribers` (`() => { button.textContent = count() }`).

Ловкость рук и никакого мошенничества 😉

---

Теперь поговорим о несогласованности данных в результате состояния гонки.

Начнем с общего описания проблемы.

- На одной странице имеется возможность модификации данных, хранящихся на сервере, несколькими способами;
- после каждой модификации от сервера запрашиваются свежие данные (выполняются одинаковые запросы);
- при получении ответа на каждый запрос обновляется локальное состояние (данные, хранящиеся в памяти на клиенте), которое используется для рендеринга компонентов;
- модификации (и, соответственно, запросы) могут выполняться очень быстро;
- предположим, что выполняется 2 модификации, вторая через секунду после первой;
- на сервер отправляется 2 запроса;
- первый обрабатывается сервером 3 секунды, второй - 1 секунду;
- ответ на второй запрос приходит через 2 (1 + 1) секунды (обновление локального состояния -> повторный рендеринг), а ответ на первый запрос - через 3 (0 + 3) секунды (обновление локального состояния -> повторный рендеринг);
- пользователь видит состояние, актуальное после выполнения первой модификации (sic!);
- данные на клиенте не согласованы (не совпадают) с данными на сервере.

Набросаем абстрактный пример.

Разметка:

```html
<div>
  <button>2</button>
  <button>4</button>
  <button>6</button>
</div>
<p id="counter">0</p>
<p>Last button clicked: <span id="last-btn"></span></p>
```

Скрипт:

```javascript
// функция, возвращающая случайное целое число в заданном диапазоне
const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1))
// функция, имитирующая обработку запроса сервером
const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

const [count, setCount] = createSignal(0)

const counter = document.getElementById('counter')
const lastBtn = document.getElementById('last-btn')

// текст параграфа обновляется при каждом изменении значения счетчика
createEffect(() => {
  counter.textContent = count()
})

// функция, имитирующая получение данных от сервера
// задержка может составлять от 1 до 6 секунд
const getData = async () => await sleep(randInt(1, 6) * 1000)

// функция, имитирующая отправку запроса и
// обновление локального состояния при получении ответа
const update = async (n) => {
  // в реальном приложении `n` будет возвращаться `getData()`
  await getData()
  setCount(n)
}

document.querySelectorAll('button').forEach((btn) => {
  // каждая кнопка обновляет значение счетчика своим текстом (2, 4 или 6)
  btn.addEventListener('click', () => {
    const n = btn.textContent
    // отображаем значение последней нажатой кнопки
    lastBtn.textContent = n
    // обновляем значение счетчика
    update(n)
  })
})
```

Демо:

<iframe height="300" width="100%" scrolling="no" title="race_coditions_bad" src="https://codepen.io/harryheman/embed/xxaBQZV?default-tab=html%2Cresult" frameborder="no" loading="lazy" allowtransparency="true" allowfullscreen="true">
  See the Pen <a href="https://codepen.io/harryheman/pen/xxaBQZV">
  race_coditions_bad</a> by Igor Agapov (<a href="https://codepen.io/harryheman">@harryheman</a>)
  on <a href="https://codepen.io">CodePen</a>.
</iframe>

При быстром нажатии нескольких кнопок возникает "состояние гонки", приводящее к тому, что итоговое значение счетчика может быть любым из трех: 2, 4 или 6. Мы не знаем, каким точно будет значение счетчика и не можем полагаться на него при производстве дальнейших вычислений. Кроме того, заметно, что текст параграфа все время обновляется новыми значениями. Это не есть хорошо. Значение счетчика (текст параграфа) должно быть таким же, как текст последней нажатой кнопки (последней модификации/запроса). Как этого достичь? Можно ли сделать это простыми средствами или без библиотеки не обойтись?

---

Сниппет:

```javascript
class Query {
  // переменная для хранения последнего промиса - запроса
  #lastPromise

  async last(promise) {
    // записываем промис в переменную
    this.#lastPromise = promise
    // ждем ответа от сервера
    const result = await promise
    // индикатор того, что разрешенный промис является последним запросом
    const isLast = this.#lastPromise === promise
    // возвращаем результат и индикатор
    return [result, isLast]
  }
}
```

Создаем экземпляр `Query`:

```javascript
const query = new Query()
```

Оборачиваем вызов `getData()` в метод `last` и обновляем значение счетчика только в том случае, если индикатор `isLast` имеет значение `true`, т.е. данные для обновления являются ответом на последний запрос:

```javascript
const update = async (n) => {
  const [result, isLast] = await query.last(getData())
  if (isLast) {
    // в реальном приложении в `setCount()` будет передаваться `result`
    setCount(n)
  }
}
```

Демо:

<iframe height="300" width="100%" scrolling="no" title="race_conditions_good" src="https://codepen.io/harryheman/embed/LYJaXJz?default-tab=html%2Cresult" frameborder="no" loading="lazy" allowtransparency="true" allowfullscreen="true">
  See the Pen <a href="https://codepen.io/harryheman/pen/LYJaXJz">
  race_conditions_good</a> by Igor Agapov (<a href="https://codepen.io/harryheman">@harryheman</a>)
  on <a href="https://codepen.io">CodePen</a>.
</iframe>

Теперь значение счетчика всегда будет идентично тексту последней нажатой кнопки (результату обработки последнего запроса), а обновление значения счетчика выполняется однократно.

Таким образом, мы не только обеспечиваем согласованность данных, что хорошо для пользователя*, но также предотвращаем лишний повторный рендеринг, что хорошо для производительности приложения.

\* _согласованность данных - это хорошо не только для пользователя, но также для сервера, поскольку для последующих модификаций серверных данных вполне могут использоваться данные, хранящиеся на клиенте, и т.п._

Следует отметить, что приведенное решение не является идеальным, поскольку "лишние" запросы все равно выполняются (нагрузка на сеть). Более оптимальным является техника под названием "дедупликация запросов", когда мы отменяем запросы, находящиеся в процессе выполнения, например, с помощью [AbortController.signal](https://developer.mozilla.org/ru/docs/Web/API/AbortController/signal), и выполняем только последний запрос (понятно, что выполняющийся и новый запросы должны быть идентичными)*. Данный способ намного сложнее, чем рассмотренный. На мой взгляд, для дедупликации запросов лучше использовать готовые решения типа [React Query](https://tanstack.com/query/v3/), но там вас ждет одна из самых сложных задач в веб-разработке - правильная работа с кэшем 😊 Существуют и другие способы борьбы с состоянием гонки.

\* _или просто не выполняем запросы в течение определенного времени, когда уверены, что запросы будут множественными (привет, debouncing)_

Пожалуй, это все, чем я хотел с вами поделиться.

Надеюсь, вы узнали что-то новое и не зря потратили время.

Happy coding!
