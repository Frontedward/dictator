---
slug: usesyncexternalstore
title: Заметка о хуке useSyncExternalStore
description: Заметка о хуке useSyncExternalStore
authors: harryheman
tags: [javascript, typescript, react, hook, usesyncexternalstore, хук]
---

Hello, world!

Представляю вашему вниманию перевод [этой замечательной статьи](https://julesblom.com/writing/usesyncexternalstore).

[useSyncExternalStore](https://reactjs.org/docs/hooks-reference.html#usesyncexternalstore) - это один из хуков, представленных в [React 18](https://reactjs.org/blog/2022/03/29/react-v18.html). Наряду с хуком [useInsertionEffect](https://reactjs.org/docs/hooks-reference.html#useinsertioneffect), он считается [хуком для библиотек](https://reactjs.org/docs/hooks-reference.html#library-hooks) (library hook):

_Следующие хуки предназначены для авторов библиотек для глубокой интеграции библиотек в модель React. Как правило, они не используются в коде приложения_

В [списке изменений React 18](https://reactjs.org/blog/2022/03/29/react-v18.html#react) речь также идет о библиотеках:

_Добавлен `useSyncExternalStore` для помощи в интеграции с React библиотек внешних хранилищ (external store libraries)_

<!--truncate-->

Я не разрабатываю библиотеки, поэтому не обращал особого внимания на данный хук, пока не увидел этот твит:

<img src="https://habrastorage.org/webt/dn/li/bk/dnlibkj73jitdf820p35jtv9jba.png" />
<br />

_React SSR - Не делайте так: `useState(() => { if (typeof window !==
"undefined") { return localStorage.getItem("xyz") } return fallback;
})` 🐛 Это приводит к несоответствиям гидратации useSyncExternalStore ➡️ отличный способ предотвращения проблем с гидратацией в React_

Это заставило меня обратиться к документации. Мое внимание привлек раздел ["Подписка на браузерные API"](https://beta.reactjs.org/reference/react/useSyncExternalStore#subscribing-to-a-browser-api), который начинается с таких слов:

_Еще одним случаем использования `useSyncExternalStore` является подписка на некоторое изменяющееся со временем значение, предоставляемое браузером_

Вот оно что! "Внешнее хранилище" (external store) не обязательно означает стороннюю библиотеку. Браузер - это внешнее хранилище состояния, которое может потребляться нашим приложением React. В этом нам может помочь `useSyncExternalStore`.

## Почему не `useEffect` + `useState`?

Вопрос на миллион долларов! Почему не использовать комбинацию `useState` & `useEffect` для чтения состояния браузера?

Вот что по этому поводу сказано в документации:

_Значение браузерного API может меняться со временем без ведома React, поэтому его следует читать с помощью `useSyncExternalStore`_

Согласитесь, не слишком информативно. Тут все дело в главной новой возможности React 18 - [конкурентном рендеринге](https://beta.reactjs.org/blog/2022/03/29/react-v18#what-is-concurrent-react) (concurrent rendering).

Конкурентный рендеринг означает, что React поддерживает две версии UI одновременно: одну видимую и еще одну находящуюся в процессе обработки (work-in-progress). Это позволяет избежать блокировки рендерингом основного потока (main thread) выполнения программы, что делает приложение более отзывчивым, позволяя браузеру быстрее обрабатывать возникающие события.

Для работы с состоянием в React используются хуки `useState` и `useReducer`, но они не умеют работать с состоянием, которое "живет" за пределами React, поскольку в один момент времени доступна только одна версия внешнего состояния.

Значения внешнего состояния могут меняться со временем без ведома React, что может приводить к таким проблемам, как отображение двух разных значений для одних и тех же данных.

Для решения этой проблемы и предназначен `useSyncExternalStore`. Он обнаруживает изменения во внешнем состоянии в процессе рендеринга и перезапускает рендеринг во избежание отображения несогласованного UI. Гарантией того, что UI всегда будет согласованным, является то обстоятельство, что такие обновления являются синхронными.

Таким образом, `useSyncExternalStore` помогает избежать несогласованности UI при работе с подписками. Кроме того, он поддерживает рендеринг на стороне сервера.

## Примеры

Как `useSyncExternalStore` может быть использован в приложении? Есть два "браузерных" хука, которые я регулярно использую в работе. Попробуем переписать их с помощью `useSyncExternalStore`.

__useMediaQuery__

`useMediaQuery` - это хук для мониторинга медиа-запросов, например, пользовательских предпочтений, таких как `prefers-color-scheme`.

Код:

```javascript
import React from "react";

type MediaQuery = `(${string}:${string})`;

function getSnapshot(query: MediaQuery) {
  return window.matchMedia(query).matches;
}

function subscribe(onChange: () => void, query: MediaQuery) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", onChange);

  return () => {
    mql.removeEventListener("change", onChange);
  };
}

export function useMediaQuery(query: MediaQuery) {
  const subscribeMediaQuery = React.useCallback((onChange: () => void) => {
    subscribe(onChange, query)
  }, [query])

  const matches = React.useSyncExternalStore(
    subscribeMediaQuery,
    () => getSnapshot(query),
  );

  return matches;
}
```

_Обратите внимание_: поскольку `query` используется в `subscribeMediaQuery`, это функция должна находиться внутри `useMediaQuery`: при каждом вызове хука должна создаваться новая ссылка на функцию.

React будет выполнять повторную подписку во время повторного рендеринга при каждой передаче новой функции подписки, что может привести к проблемам с производительностью.

Для того, чтобы выполнять повторную подписку только при изменении `query`, `subscribeMediaQuery` следует обернуть в `useCallback` и поместить `query` в его массив зависимостей.

__useWindowSize__

Еще один часто используемый браузерный хук с говорящим названием. Код:

```javascript
import React from "react";

function onWindowSizeChange(onChange: () => void) {
  window.addEventListener("resize", onChange);

  return () => window.removeEventListener("resize", onChange);
}

const getWindowWidthSnapshot = () => window.innerWidth;

const getWindowHeightSnapshot = () => window.innerHeight;

function useWindowSize({ widthSelector, heightSelector }) {
  const windowWidth = React.useSyncExternalStore(
    onWindowSizeChange,
    getWindowWidthSnapshot
  );

  const windowHeight = React.useSyncExternalStore(
    onWindowSizeChange,
    getWindowHeightSnapshot
  );

  return { width: windowWidth, height: windowHeight };
}
```

Попытка вернуть объект:

```javascript
function getWindowSizeSnapshot() {
  return { width: window.innerHeight, height: window.innerHeight } // 💥
}
```

Закончилась ошибкой "Слишком много повторных рендерингов". Почему? Потому что `useSyncExternalStore` имеет одно [важное ограничение](https://beta.reactjs.org/reference/react/useSyncExternalStore#im-getting-an-error-the-result-of-getsnapshot-should-be-cached): значение, возвращаемое `getSnapshot`, должно быть иммутабельным. Это означает, что мы не может возвращать, например, массивы или объекты.

Кроме разделения высоты и ширины, проблему можно решить мемоизацией. Я выбрал разделение из-за простоты реализации. Было бы неплохо иметь для этого правило ESLint.

__Ограничение количества повторных рендерингов__

В [этой интересной статье](https://thisweekinreact.com/articles/useSyncExternalStore-the-underrated-react-api) обсуждается возможность использования `useSyncExternalStore` в качестве функции-селектора.

Селектор читает состояние как аргумент и возвращает данные на основе этого состояния. Количество обновлений может быть ограничено путем передачи функции-селектора в `getSnapshot`.

Предположим, что нас интересует изменение ширины окна не на каждый пиксель, а на каждые 100 пикселей. Тогда `useWindowSize` можно переписать следующим образом:

```javascript
const widthStep = 100; // px

const widthSelector = (width: number) => (width ? Math.floor(width / widthStep) * widthStep : 1)

function windowWidthSnapshot(selector = (width: number) => width) {
  return selector(window.innerWidth);
}

function App() {
  const width = useSyncExternalStore(onWindowSizeChange, () =>
    windowWidthSnapshot(widthSelector)
  );

  // ...
}
```

## SSR

В качестве третьего опционального параметра `useSyncExternalStore` принимает функцию `getServerSnapshot`. Эта функция возвращает начальный снимок (initial snapshot), который используется в процессе серверного рендеринга и в процессе гидратации, что позволяет избежать [опасностей регидратации](https://www.joshwcomeau.com/react/the-perils-of-rehydration/).

Существует два нюанса, связанных с использованием `getServerSnapshot`:

1. Она должна быть определена при использовании `useSyncExternalStore` на сервере, в противном случае возникнет ошибка.
2. Значение, возвращаемое функцией, должно быть одинаковым на клиенте и на сервере.

Разумеется, мы не может читать браузерное состояние в процессе SSR, поскольку глобальный объект `window` доступен только на клиенте.

Как нам быть в этой ситуации?

__Исключительно клиентские компоненты__

В [документации React](https://beta.reactjs.org/reference/react/useSyncExternalStore#adding-support-for-server-rendering) рекомендуется рендерить такие компоненты только на клиенте:

_`getServerSnapshot` позволяет предоставлять начальный снимок, который используется перед тем, как приложение становится интерактивным. При отсутствии подходящего начального снимка, можно [заставить компонент рендериться только на клиенте](https://beta.reactjs.org/reference/react/Suspense#providing-a-fallback-for-server-errors-and-server-only-content)_

Суть указанного выше раздела документации может быть сведена к следующему:

_Если компонент выбрасывает ошибку на сервере, React не прекращает серверный рендеринг. Вместо этого, он ищет ближайший компонент `<Suspense>` и включает его резервный контент (fallback) (такой как спиннер) в генерируемый (серверный) HTML. На клиенте React попытается снова отрендерить этот компонент. Если на клиенте не возникает ошибки, серверная ошибка игнорируется. Это можно использовать для реализации исключительно клиентских компонентов. Т.е. мы выбрасываем в таком компоненте ошибку на сервере и оборачиваем его в предохранитель `<Suspense>` для замены его HTML резервным контентом._

Или своими словами: нет смысла рендерить на сервере компонент, которому требуется информация от клиента. Мы оставляем дыру в дереве компонентов на сервере, выбрасывая ошибку, и передаем дерево клиенту, который заполняет эту дыру после получения информации, доступной только на клиенте.

_Обратите внимание_: React позволяет подавлять неизбежные несоответствия гидратации с помощью пропа `suppressHydrationWarning`. Он работает только для атрибутов и текстового содержимого. Несоответствия считаются багами, которые могут приводить к неправильным значениям, поэтому `suppressHydrationWarning` следует использовать на свой страх и риск:

```javascript
function Canvas() {
  const windowWidth = useSyncExternalStore(
    onWindowSizeChange,
    () => window.innerWidth,
    () => 1200 // ⚠️ Предупреждение!
  );

  return <canvas width={windowWidth} suppressHydrationWarning />
}
```

## Заключение

Надеюсь, эта статья хотя бы немного демистифицировала для вас "что такое" и "для чего используется" `useSyncExternalStore`.

- `useSyncExternalStore` предназначен в основном (но не только) для библиотек:
  - его цель - подписка на внешнее состояние;
  - браузер - это внешнее хранилище, которое может быть синхронизировано с приложением React;
  - он рассчитан на работу в режиме конкурентного рендеринга, что позволяет избежать несогласованного UI;
- если функция `subscribe` является нестабильной, React будет выполнять повторную подписку при каждом рендеринге;
- функция `getSnapshot` должна возвращать иммутабельные значения;
- функция `getServerSnapshot` предназначена для поддержки SSR:
  - должна возвращать одинаковые данные для клиента и сервера, поэтому с браузерными API здесь работать нельзя;
  - если для компонента нельзя предоставить разумное начальное значение на сервере, делаем его исключительно клиентским, выбрасывая ошибку на сервере и оборачивая компонент в предохранитель `<Suspense>` для отображения резервного контента.

__Ссылки на дополнительные материалы__

- [React 18 для библиотек внешних хранилищ](https://www.youtube.com/watch?v=oPfSC5bQPR8);
- [Элементы разработки UI](https://overreacted.io/the-elements-of-ui-engineering/);
- [Рабочая группа React 18 - Конкурентный React для разработчиков библиотек](https://github.com/reactwg/react-18/discussions/70);
- [Рабочая группа React 18 - Что такое разрыв (tearing)?](https://github.com/reactwg/react-18/discussions/69);
- [Глоссарий React 18 + Объяснение пятилетнему](https://github.com/reactwg/react-18/discussions/46).

Надеюсь, вы узнали что-то новое и не зря потратили время.

Happy coding!
