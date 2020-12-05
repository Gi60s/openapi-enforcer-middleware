const fs = require('fs')
const path = require('path')
const navigation = require('./static/navigation.json')

const basePath = path.resolve(__dirname, 'content')
const baseUrl = '/openapi-enforcer-middleware'
const publicPath = 'https://byu-oit.github.io' + baseUrl
const rxMd = /\.md$/i

export default {
  /*
  ** Nuxt rendering mode
  ** See https://nuxtjs.org/api/configuration-mode
  */
  mode: 'spa',
  /*
  ** Nuxt target
  ** See https://nuxtjs.org/api/configuration-target
  */
  target: 'static',

  publicRuntimeConfig: {
    baseUrl: process.env.ENV === 'prod' ? baseUrl : ''
  },

  // https://nuxtjs.org/guides/configuration-glossary/configuration-generate
  generate: {
    routes: generateRoutes(basePath, basePath)
  },

  /*
  ** Headers of the page
  ** See https://nuxtjs.org/api/configuration-head
  */
  head: {
    title: 'OpenAPI Enforcer Middleware',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: process.env.npm_package_description || '' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: baseUrl + '/favicon.png' }
    ]
  },
  /*
  ** Global CSS
  */
  css: [
    // 'element-ui/lib/theme-chalk/index.css',
    '~/static/element-ui-theme.css',
    { src: '~/assets/main.styl', lang: 'style' }
  ],
  /*
  ** Plugins to load before mounting the App
  ** https://nuxtjs.org/guide/plugins
  */
  plugins: [
    '@/plugins/element-ui'
  ],
  /*
  ** Auto import components
  ** See https://nuxtjs.org/api/configuration-components
  */
  components: true,
  /*
  ** Nuxt.js dev-modules
  */
  buildModules: [
  ],
  /*
  ** Nuxt.js modules
  */
  modules: [
    // Doc: https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
    // Doc: https://github.com/nuxt/content
    '@nuxt/content',
  ],
  /*
  ** Axios module configuration
  ** See https://axios.nuxtjs.org/options
  */
  axios: {},
  /*
  ** Content module configuration
  ** See https://content.nuxtjs.org/configuration
  */
  content: {
    markdown: {
      prism: {
        theme: 'prism-themes/themes/prism-hopscotch.css'
      }
    }
  },
  /*
  ** Build configuration
  ** See https://nuxtjs.org/api/configuration-build/
  */
  build: {
    transpile: [/^element-ui/],
    publicPath
  }
}

function generateRoutes (basePath, dirPath, routes = []) {
  const fileNames = fs.readdirSync(dirPath)
  fileNames.forEach(fileName => {
    const filePath = path.resolve(dirPath, fileName)
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      generateRoutes(basePath, filePath, routes)
    } else if (stat.isFile() && rxMd.test(fileName)) {
      const relPath = path.relative(basePath, filePath)
      const parts = relPath.split(path.sep)
      const lastIndex = parts.length - 1
      parts[lastIndex] = parts[lastIndex].replace(/\.md$/i, '')
      if (parts[lastIndex].toLowerCase() === 'index') parts.pop()

      const joined = '/' + parts.join('/')
      routes.push(joined)
    }
  })
  return routes
}

function validateNavigation (navigation, routes) {
  const navArray = []

  Object.keys(navigation).forEach(version => {
    buildNavArray('/' + version, navigation[version])
  })

  function buildNavArray (prefix, navs) {
    navs.forEach(nav => {
      if (nav.children) {
        buildNavArray(prefix, nav.children)
      } else {
        const path = nav.path === '/' ? '' : nav.path
        navArray.push(prefix + path)
      }
    })
  }

  // console.log('Nav Array: ', navArray)
  // console.log('Routes: ', routes)

  const missing = navArray.filter(item => {
    const index = routes.indexOf(item)
    return index === -1
  })

  if (missing.length) {
    throw Error('One or more navigation paths are defined for pages that do not exist: \n  ' + missing.join('\n  '))
  }
}
