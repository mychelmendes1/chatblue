import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'ChatBlue',
  tagline: 'Plataforma Multi-tenant de Atendimento ao Cliente via WhatsApp',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.chatblue.com.br',
  baseUrl: '/',

  organizationName: 'chatblue',
  projectName: 'chatblue',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'pt-BR',
    locales: ['pt-BR'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/chatblue/chatblue/tree/main/docs-site/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/chatblue-social-card.jpg',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    navbar: {
      title: 'ChatBlue',
      logo: {
        alt: 'ChatBlue Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentacao',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API',
        },
        {
          type: 'docSidebar',
          sidebarId: 'guidesSidebar',
          position: 'left',
          label: 'Guias',
        },
        {
          href: 'https://github.com/chatblue/chatblue',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentacao',
          items: [
            {
              label: 'Introducao',
              to: '/',
            },
            {
              label: 'Instalacao',
              to: '/instalacao/requisitos',
            },
            {
              label: 'Arquitetura',
              to: '/arquitetura/visao-geral',
            },
          ],
        },
        {
          title: 'Referencia',
          items: [
            {
              label: 'API REST',
              to: '/api/introducao',
            },
            {
              label: 'Banco de Dados',
              to: '/backend/banco-de-dados',
            },
            {
              label: 'WebSocket',
              to: '/backend/websocket',
            },
          ],
        },
        {
          title: 'Guias',
          items: [
            {
              label: 'WhatsApp',
              to: '/guias/whatsapp/configuracao',
            },
            {
              label: 'Inteligencia Artificial',
              to: '/guias/inteligencia-artificial/configuracao',
            },
            {
              label: 'Deploy',
              to: '/deploy/producao',
            },
          ],
        },
        {
          title: 'Mais',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/chatblue/chatblue',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ChatBlue. Documentacao construida com Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript', 'sql', 'yaml', 'docker'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
