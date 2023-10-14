/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Dictator',
  tagline:
    'JavaScript, React, TypeScript, Node.js, Express, Prisma, GraphQL, Docker',
  url: '',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/logo1.png',
  organizationName: 'frontedward', // Usually your GitHub org/user name.
  projectName: 'Dictator', // Usually your repo name.

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/frontedward/dictator',
          breadcrumbs: false
        },
        blog: {
          blogTitle: 'Блог по веб-разработке',
          blogDescription:
            'Блог по разработке приложений на JavaScript, React, TypeScript, Node.js и других технологиях',
          showReadingTime: true,
          // Please change this to your repo.
          editUrl: 'https://github.com/frontedward/dictator'
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      })
    ]
  ],
  plugins: [
    [
      '@docusaurus/plugin-pwa',
      {
        debug: true,
        offlineModeActivationStrategies: [
          'appInstalled',
          'standalone',
          'queryString'
        ],
        pwaHead: [
          {
            tagName: 'link',
            rel: 'icon',
            href: '/img/logo.png'
          },
          {
            tagName: 'link',
            rel: 'manifest',
            href: '/manifest.json'
          },
          {
            tagName: 'meta',
            name: 'theme-color',
            content: '#3c3c3c'
          },
          {
            tagName: 'meta',
            name: 'apple-mobile-web-app-capable',
            content: 'yes'
          },
          {
            tagName: 'meta',
            name: 'apple-mobile-web-app-status-bar-style',
            content: '#3c3c3c'
          },
          {
            tagName: 'link',
            rel: 'apple-touch-icon',
            href: '/img/logo.png'
          },
          {
            tagName: 'link',
            rel: 'mask-icon',
            href: '/img/logo.png',
            color: '#3c3c3c'
          },
          {
            tagName: 'meta',
            name: 'msapplication-TileImage',
            content: '/img/logo.png'
          },
          {
            tagName: 'meta',
            name: 'msapplication-TileColor',
            content: '#3c3c3c'
          }
        ]
      }
    ]
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/logo1.png',
      navbar: {
        title: 'Dictator',
        logo: {
          alt: 'Dictator Logo',
          src: 'img/logo1.png'
        },
        items: [
          {
            type: 'doc',
            docId: 'guide/intro-guide',
            position: 'left',
            label: 'Руководства'
          },
          {
            type: 'doc',
            docId: 'cheatsheet/intro-cheatsheet',
            position: 'left',
            label: 'Шпаргалки'
          },
          {
            type: 'doc',
            docId: 'other/intro-other',
            position: 'left',
            label: 'Другое'
          },
          // {
          //   type: 'doc',
          //   docId: 'links/intro-links',
          //   position: 'left',
          //   label: 'Cсылки'
          // },
          // { to: 'blog', label: 'Блог', position: 'left' },
          // Please keep GitHub link to the right for consistency.
          {
            href: 'https://github.com/frontedward',
            label: 'GitHub',
            position: 'right'
          }
        ]
      },
      // footer: {
      //   style: 'dark',
      //   links: [
      //     {
      //       title: 'Контакты',
      //       items: [
      //         {
      //           html: '<p class="footer__link"><img src="../../img/github.png" alt="" width="32" height="32"> <a href="https://github.com/frontedward" target="_blank">frontedward</a></p>'
      //         },
      //         {
      //           html: '<p class="footer__link"><img src="../../img/telegram.png" alt="" width="32" height="32"> @frontedward</p>'
      //         },
      //         {
      //           html: '<p class="footer__link"><img src="../../img/email.png" alt="" width="32" height="32"><a href="e.shabronsky@gmail.com">e.shabronsky@gmail.com</a></p>'
      //         },
      //         {
      //           label: 'Habr',
      //           href: 'https://habr.com/ru/users/bronberg'
      //         }
      //       ]
      //     }
      //   ],
      //   // Please do not remove the credits, help to publicize Docusaurus :)
      //   copyright: `
      //     Copyright © ${new Date().getFullYear()}. Dictator. <br />
      //     Built by <a href="https://github.com/frontedward" target="_blank" rel="noopener noreferrer">Frontedward</a> with&nbsp;🖤&nbsp;&nbsp;&amp; <a href="https://docusaurus.io/" target="_blank" rel="noopener noreferrer">Docusaurus</a>. <br />
      //     Deploys on <a href="https://www.netlify.com/" target="_blank" rel="noopener noreferrer">Netlify</a>.
      //   `
      // },
      hideableSidebar: true,
      autoCollapseSidebarCategories: true,
      algolia: {
        appId: 'K9EMNI09N5',
        apiKey: '415a654b5e8424ce6bb502e4d9689c4a',
        indexName: 'my-js',
        contextualSearch: true
      }
    })
}

module.exports = config
