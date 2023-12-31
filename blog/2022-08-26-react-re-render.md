---
slug: react-re-render
title: Полное руководство по повторному рендерингу React
description: Полное руководство по повторному рендерингу React
authors: harryheman
tags: [react.js, reactjs, react, render, rerender]
---

Привет, друзья!

Представляю вашему вниманию перевод [этой замечательной статьи](https://www.developerway.com/posts/react-re-renders-guide), посвященной повторному рендерингу (re-render, далее  — ререндеринг) в [React](https://ru.reactjs.org/).

## Что такое ререндеринг?

Существует 2 основные стадии, которым следует уделять пристальное внимание, когда речь заходит о производительности в `React`:

- первоначальный рендеринг (initial rendering)  — происходит, когда компонент впервые появляется на экране;
- ререндеринг  — второй и последующие рендеринги компонента.

Ререндеринг происходит, когда `React` необходимо обновить приложение некоторыми данными. Обычно, это является результатом действий пользователя, получения ответа на асинхронный запрос или публикацию при подписке (паттерн "pub/sub" — публикация/подписка или издатель/подписчик) на определенные данные.

<!--truncate-->

## Что такое необходимый и лишний (ненужный) ререндеринги?

Необходимый (necessary) ререндеринг — это повторный рендеринг компонента, подвергшегося некоторым изменениям или получившего новые данные. Например, если пользователь вводит данные в поле (инпут), компонент, управляющий состоянием, должен обновляться при вводе каждого символа, т. е. ререндериться.

Лишний (unnecessary) ререндеринг — повторный рендеринг компонента, вызываемый различными механизмами ререндеринга в результате ошибки или неэффективной архитектуры приложения. Например, если при вводе данных в инпут пользователем ререндерится вся страница, такой ререндеринг, скорее всего, является лишним.

Сам по себе лишний рендеринг не является проблемой: `React` является достаточно быстрым, чтобы выполнять его незаметно для пользователя.

Однако, если ререндеринг происходит очень часто или речь идет о тяжелом с точки зрения производительности компоненте, пользовательский опыт может быть испорчен «лаганием» (временной утратой интерактивности страницей), заметными задержками в ответ на взаимодействие пользователя со страницей или полным зависанием страницы.

## Когда происходит ререндеринг?

Существует 4 причины, по которым компонент подвергается ререндерингу: изменение состояния, ререндеринг родительского компонента, изменение контекста и изменение хука. Существует распространенный миф о том, что ререндеринг происходит также при изменении пропов. Это не совсем так (см. ниже).

### Модификация состояния

Компонент всегда подвергается ререндерингу при изменении его состояния. Обычно, это происходит в функции обратного вызова или в хуке `useEffect`.

_Изменения состояния влекут за собой безусловный (непредотвращаемый) ререндеринг_

[Пример на CodeSandbox](https://codesandbox.io/s/part2-1-re-renders-because-of-state-ngh8uc?file=/src/App.tsx)

<img src="https://habrastorage.org/webt/qm/9j/ag/qm9jagqd8_b5ajh_yukyjf9svuc.png" />
<br />

### Ререндеринг предка

Компонент подвергается ререндерингу при повторном рендеринге его родительского компонента. Другими словами, когда компонент повторно рендерится, его потомки также ререндерятся.

Ререндеринг «спускается» вниз по дереву компонентов: повторный рендеринг дочернего компонента не влечет ререндеринг его предка (на самом деле, существует несколько пограничных случаев, когда такое возможно: [The mystery of React Element, children, parents and re-renders](https://www.developerway.com/posts/react-elements-children-parents)).

[Пример на CodeSandbox](https://codesandbox.io/s/part-2-2-re-renders-because-of-parent-b0xvxt?file=/src/App.tsx)

<img src="https://habrastorage.org/webt/ja/63/uv/ja63uvmkni2lhb1lhmui_c2jy3a.png" />
<br />

### Модификация контекста

При изменении значения, передаваемого в провайдер контекста (Context Provider), все компоненты, потребляющие (consume) контекст (эти значения), подвергаются повторному рендерингу, даже если они не используют модифицированные данные. Данный вид ререндеринга нелегко предотвратить, но это возможно (см. ниже).

[Пример на CodeSandbox](https://codesandbox.io/s/part-2-3-re-render-because-of-context-i75lwh?file=/src/App.tsx).

<img src="https://habrastorage.org/webt/pp/xy/li/ppxyligobeoskb1vs1jqkw_ijnk.png" />
<br />

### Модификация хука

Все, что происходит внутри хука, «принадлежит» использующему его компоненту. Здесь действуют те же правила:

- изменение состояния хука влечет безусловный ререндеринг «хостового» (host) компонента;
- если хук потребляет контекст, модификация контекста повлечет безусловный ререндеринг компонента, использующего хук.

Хуки могут вызываться по цепочке. Каждый хук в цепочке принадлежит хостовому компоненту  — модификация любого хука влечет безусловный ререндеринг соответствующего компонента.

[Пример на CodeSandbox](https://codesandbox.io/s/part-2-4-re-render-because-of-hooks-5kpdrp?file=/src/App.tsx)

<img src="https://habrastorage.org/webt/al/u7/rx/alu7rxltxzbdoert_ieecrt6tjq.png" />
<br />

### Изменение пропов (распространенное заблуждение)

До тех пор, пока речь не идет о мемоизированных компонентах, изменения пропов особого значения не имеют.

Модификация пропов означает их обновление родительским компонентом. Это, в свою очередь, означает ререндеринг родительского компонента, влекущий повторный рендеринг всех его потомков.

[Пример на CodeSandbox](https://codesandbox.io/s/part-2-5-re-render-props-not-relevant-2b8o0p?file=/src/App.tsx)

Изменения пропов становятся важными только при применении различных техник мемоизации (`React.memo`, `useMemo`).

<img src="https://habrastorage.org/webt/kd/ej/9f/kdej9fm9l9od3zgow5dh7zj5tzu.png" />
<br />

## Предотвращение ререндеринга с помощью композиции

### Антипаттерн: создание компонентов в функции рендеринга

Создание компонентов внутри функции рендеринга другого компонента является антипаттерном, который может очень негативно влиять на производительность. `React` будет повторно монтировать (remount), т. е. уничтожать и создавать с нуля такой компонент при каждом рендеринге, что будет существенно замедлять обычный рендеринг. Это может привести к таким багам, как:

- «вспышки» (flashes) разного контента в процессе рендеринга;
- сброс состояния компонента при каждом рендеринге;
- запуск `useEffect` без зависимостей при каждом рендеринге;
- потеря фокуса, если компонент находился в этом состоянии и т. д.

[Пример на CodeSandbox](https://codesandbox.io/s/part-3-1-creating-components-inline-t2vmkj?file=/src/App.tsx)

Дополнительные материалы: [How to write performant React code: rules, patterns, do's and don'ts](https://www.developerway.com/posts/how-to-write-performant-react-code)

### Паттерн: перемещение состояния вниз

Данный паттерн используется, когда тяжелый компонент управляет состоянием, которое используется лишь небольшой частью дерева компонентов. Типичным примером может быть открытие/закрытие диалогового/модального окна при нажатии кнопки в сложном компоненте, который рендерит существенную часть страницы.

В этом случае состояние, управляющее видимостью окна, само окно и кнопка, вызывающая обновление состояния окна, могут быть инкапсулированы в отдельном компоненте. Как результат, большой компонент не будет ререндериться при модификации такого состояния.

[Пример на CodeSandbox](https://codesandbox.io/s/part-3-2-moving-state-down-vlh4gf?file=/src/App.tsx)

Дополнительные материалы: [The mystery of React Element, children, parents and re-renders](https://www.developerway.com/posts/react-elements-children-parents), [How to write performant React code: rules, patterns, do's and don'ts](https://www.developerway.com/posts/how-to-write-performant-react-code).

<img src="https://habrastorage.org/webt/cd/2p/ef/cd2pefe8v80urtgphau7gliophy.png" />
<br />

### Паттерн: передача потомков в виде пропов

Это называется «оборачиванием состояния вокруг потомков». Данная техника похожа на предыдущую: изменения состояния инкапсулируются в меньшем компоненте. Разница состоит в том, что состояние используется в качестве обертки медленной часть дерева рендеринга, что облегчает его извлечение. Типичными примерами являются обработчики `onScroll` или `omMouseMove`, зарегистрированные на корневом элементе компонента.

В этом случае управление состоянием и использующий его компонент могут быть извлечены в отдельный компонент, а медленный компонент может передаваться ему как `children`. С точки зрения инкапсулирующего компонента `children` — обычный проп, поэтому потомки не подвергаются ререндерингу при модификации состояния.

[Пример на CodeSandbox](https://codesandbox.io/s/part-3-3-children-as-props-59icyq?file=/src/App.tsx)

Дополнительные материалы: [The mystery of React Element, children, parents and re-renders](https://www.developerway.com/posts/react-elements-children-parents)

<img src="https://habrastorage.org/webt/im/ic/yv/imicyvwnnkaqax45xn4pwautw3g.png" />
<br />

### Паттерн: передача компонентов в виде пропов

Данный паттерн очень похож на предыдущий: состояние инкапсулируется внутри меньшего компонента, а большом компонент передается ему как `props`. Пропы не затрагиваются модификацией состояния, поэтому тяжелый компонент не подвергается ререндерингу.

Может использоваться в случае, когда несколько больших компонентов не зависят от состояния, но не могут быть извлечены как `children`.

[Пример на CodeSandbox](https://codesandbox.io/s/part-3-4-passing-components-as-props-9h3o5u?file=/src/App.tsx)

Дополнительные материалы: [React component as prop: the right way™️](https://www.developerway.com/posts/react-component-as-prop-the-right-way), [The mystery of React Element, children, parents and re-renders](https://www.developerway.com/posts/react-elements-children-parents).

<img src="https://habrastorage.org/webt/yc/lk/p8/yclkp88imgradt4unztbrfdtu5s.png" />
<br />

## Предотвращение ререндеринга с помощью `React.memo`

Оборачивание компонента в `React.memo` останавливает нисходящую цепочку ререндерингов, запущенную где-то выше в дереве компонентов, до тех пор, пока пропы остаются неизменными.

Может использоваться в тяжелых компонентах, не зависящих от источника ререндеринга (состояние, данные и др.).

[Пример на CodeSandbox](https://codesandbox.io/s/part-4-simple-memo-fz4xhw?file=/src/App.tsx)

<img src="https://habrastorage.org/webt/ar/o9/o_/aro9o_fvpx10eirc18jxsnl8vt8.png" />
<br />

### `React.memo`: компонент с пропами

Все пропы, которые не являются примитивными значениями, должны мемоизироваться, например, с помощью хука `useMemo` до передачи компоненту, мемоизируемому с помощью `React.memo`.

[Пример на CodeSandbox](https://codesandbox.io/s/part-4-1-memo-on-component-with-props-fq55hm?file=/src/App.tsx)

<img src="https://habrastorage.org/webt/x1/kd/y7/x1kdy7hijphqi4olenzkompltdo.png" />
<br />

### `React.memo`: компоненты, передаваемыми в виде пропов, или потомки

Компоненты, передаваемые другим компонентам как пропы, или дочерние компоненты должны мемоизироваться с помощью `React.memo`. Мемоизация родительского компонента работать не будет: потомки и компоненты-пропы — это объекты, которые будут разными при каждом рендеринге.

Дополнительные материалы: [The mystery of React Element, children, parents and re-renders](https://www.developerway.com/posts/react-elements-children-parents)

[Пример на CodeSandbox](https://codesandbox.io/s/part-4-2-memo-on-components-in-props-55tebl?file=/src/App.tsx)

<img src="https://habrastorage.org/webt/wd/ll/zr/wdllzrvlctb-gqsudzns0_2-ask.png" />
<br />

## Повышение производительности ререндеринга с помощью хуков `useCallback` и `useMemo`

### Антипаттерн: ненужная мемоизация пропов с помощью `useCallback/useMemo`

Мемоизация пропов сама по себе не предотвращает ререндеринг дочернего компонента. Повторный рендеринг родительского компонента влечет безусловный ререндеринг его потомков независимо от пропов.

[Пример на CodeSandbox](https://codesandbox.io/s/part-5-1-unnecessary-usememo-lmk8fq?file=/src/App.tsx)

<img src="https://habrastorage.org/webt/rd/f0/tg/rdf0tg1m4oyqhifbji3ajjhrdu8.png" />
<br />

### Обязательное применение `useMemo/useCallback`

Если дочерний компонент обернут в `React.memo`, все пропы, не являющиеся примитивами, должны быть предварительно мемоизированы.

[Пример на CodeSandbox](https://codesandbox.io/s/part-5-2-usememo-in-props-trx97x?file=/src/App.tsx)

<img src="https://habrastorage.org/webt/xp/al/al/xpalalnq3tsurdv1tgkrgfplf_k.png" />
<br />

Если компонент использует непримитивные значения в качестве зависимостей таких хуков, как `useEffect`, `useMemo` или `useCallback`, они также должны быть мемоизированы.

[Пример на CodeSandbox](https://codesandbox.io/s/part-5-2-usememo-in-effect-88tbov)

<img src="https://habrastorage.org/webt/jj/h6/5f/jjh65ft6qo3inht3tgqj-mdanxa.png" />
<br />

### Использование `useMemo` для «дорогих» вычислений

Хук `useMemo` предназначен для предотвращения дорогих с точки зрения производительности вычислений при повторных рендерингах.

Использование `useMemo` имеет свою цену: потребляется больше памяти и, как следствие, первоначальный рендеринг становится медленнее. Поэтому его следует применять с умом. В `React` самые дорогие вычисления производятся при монтировании и обновлении компонентов.

Поэтому типичным примером использования `useMemo` является мемоизация `React-элементов`. Такими элементами, как правило, является часть существующего дерева рендеринга или результат генерации такого дерева, например, функция `map`, возвращающая массив элементов.

Стоимость «чистых» операций, таких как сортировка или фильтрация массива, обычно, являются незначительными по сравнению с обновлениями компонентов.

[Пример на CodeSandbox](https://codesandbox.io/s/part-5-3-usememo-for-expensive-calculations-trx97x?file=/src/App.tsx)

<img src="https://habrastorage.org/webt/2q/pd/la/2qpdlafmvkg_j-gheavlx0gtxpk.png" />
<br />

## Повышение производительности ререндеринга списков

Когда речь идет о ререндеринге списков, проп `key` может иметь важное значение.

_Внимание_: само по себе предоставление пропа `key` не повышает производительность рендеринга списка. Для предотвращения ререндеринга элементов списка, они должны оборачиваться в `React.memo` и следовать другим лучшим практикам.

Значением пропа `key` должна быть строка, уникальная в пределах компонента и стабильная для элемента. Как правила, для этого используется `id` или индекс элемента в массиве.

_Внимание_: индекс следует использовать только в крайнем случае, когда можно быть уверенным, что список является статичным — количество и порядок элементов являются постоянными величинами. Если элементы добавляются/удаляются/вставляются/меняются местами, индексы использовать нельзя.

Использование индексов в качестве ключей элементов динамического списка может привести к:

- багам, связанным с неправильным состоянием компонентов или неуправляемых элементов (таких как поля для ввода);
- снижению производительности, если компоненты обернуты в `React.memo`.

Дополнительные материалы: [React key attribute: best practices for performant lists](https://www.developerway.com/posts/react-key-attribute)

[Пример на CodeSandbox — статический список](https://codesandbox.io/s/part-6-static-list-with-index-and-id-as-key-7i0ebi?file=/src/App.tsx)

[Пример на CodeSandbox — динамический список](https://codesandbox.io/s/part-6-dynamic-list-with-index-and-id-as-key-s50knr?file=/src/App.tsx)

<img src="https://habrastorage.org/webt/ew/7c/pi/ew7cpisbsfwivcqsf9bmsis1yyk.png" />
<br />

### Антипаттерн: произвольные значения пропа `key`

Значением `key` никогда не должны быть рандомные значения. Это приведет к перемонтированию элементов списка при каждом рендеринге, что повлечет за собой:

- очень низкую производительность списка;
- баги, связанные с неправильным состоянием компонентов или неуправляемых элементов (таких как поля для ввода).

[Пример на CodeSandbox](https://codesandbox.io/s/part-6-1-random-values-in-keys-z1zhy6?file=/src/App.tsx)

<img src="https://habrastorage.org/webt/la/fu/-y/lafu-yh4sjgrkxkby5kxueipcr0.png" />
<br />

## Предотвращение ререндеринга, вызываемого контекстом

### Мемоизация значения, передаваемого провайдеру

Если провайдер контекста находится не на верхнем уровне приложения и существует вероятность того, что он подвергнется ререндерингу вследствие повторного рендеринга его предков, значение, передаваемое провайдеру, должно быть мемоизировано.

[Пример на CodeSandbox](https://codesandbox.io/s/part-7-1-memoize-context-provider-value-qgn0me?file=/src/App.tsx)

<img src="https://habrastorage.org/webt/1w/q_/qt/1wq_qtubb_r2ulquujacyp_1efe.png" />
<br />

### Разделение данных и интерфейсов

Если контекст содержит комбинацию данных и интерфейсов (геттеров и сеттеров), они могут быть разделены на разные провайдеры в рамках одного компонента. Это предотвратит ререндеринг компонентов, которые, например, используют `API`, но не зависят от данных.

Дополнительные материалы: [How to write performant React apps with Context](https://www.developerway.com/posts/how-to-write-performant-react-apps-with-context)

[Пример на CodeSandbox](https://codesandbox.io/s/part-7-2-split-context-data-and-api-r8lsws?file=/src/App.tsx)

<img src="https://habrastorage.org/webt/q8/78/ux/q878ux_a4awzaogmfd0use3-gtu.png" />
<br />

### Разделение данных на части

Если контекст управляет несколькими независимыми частями данных (data chunks), его можно разделить на несколько провайдеров. В результате ререндериться буду только компоненты, потребляющие модифицированные данные.

Дополнительные материалы: [How to write performant React apps with Context](https://www.developerway.com/posts/how-to-write-performant-react-apps-with-context)

[Пример на CodeSandbox](https://codesandbox.io/s/part-7-3-split-context-into-chunks-dbg20m?file=/src/App.tsx)

<img src="https://habrastorage.org/webt/mh/sh/b2/mhshb2pw4q55mut6kxzgpqllm4u.png" />
<br />

### Селекторы контекста

Компонент подвергается безусловному ререндерингу при любом изменении контекста, даже если потребляемое им значение осталось прежним, даже с помощью `useMemo`.

Однако, можно сымитировать селекторы контекста с помощью компонентов высшего порядка (higher-order components, HOC) и `React.memo`.

Дополнительные материалы: [Higher-Order Components in React Hooks era](https://www.developerway.com/posts/higher-order-components-in-react-hooks-era)

[Пример на CodeSandbox](https://codesandbox.io/s/part-7-4-context-selector-lc8n5g?file=/src/App.tsx)

<img src="https://habrastorage.org/webt/nn/je/os/nnjeost5bilfxk2jtjfm3crluxc.png" />
<br />

Благодарю за внимание и happy coding!
