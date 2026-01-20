import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'ChatBlue',
  tagline: 'Plataforma Multi-tenant de Atendimento ao Cliente via WhatsApp',
  favicon: 'img/favicon.png',

  future: {
    v4: true,
  },

  url: 'https://chat.grupoblue.com.br',
  baseUrl: '/docs/',

  organizationName: 'grupoblue',
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
          // Removido editUrl para esconder botão "Editar essa página"
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/favicon.png',
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
        src: 'img/favicon.png',
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
          type: 'docSidebar',
          sidebarId: 'trainingSidebar',
          position: 'left',
          label: 'Treinamento',
        },
        {
          href: 'https://chat.grupoblue.com.br',
          label: 'Voltar ao Sistema',
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
          title: 'Treinamento',
          items: [
            {
              label: 'Manual do Atendente',
              to: '/treinamento/atendente/primeiros-passos',
            },
            {
              label: 'Manual do Supervisor',
              to: '/treinamento/supervisor/visao-geral',
            },
            {
              label: 'Manual do Administrador',
              to: '/treinamento/administrador/painel-controle',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Grupo Blue. Todos os direitos reservados.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript', 'sql', 'yaml', 'docker'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
