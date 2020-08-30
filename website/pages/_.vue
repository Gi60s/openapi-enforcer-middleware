<template>
  <div class='page'>
    <div class='header'>
      <div class="center">
        <!-- site title / header -->
        <div class="site-header">
          <nuxt-link to="/">
            <h1>OpenAPI Enforcer Middleware</h1>
          </nuxt-link>
        </div>
        <div class="spacer"></div>

        <!-- mobile view menu button -->
        <el-button class="mobile-menu-button" icon="el-icon-menu"></el-button>

        <div class="site-navigation">
          <search :version="navigation.selected.version" />

          <!-- top menu -->
          <el-menu :default-active="navigation.selected.top" mode="horizontal" @select="navSelectPage">
            <!-- <el-menu-item v-for="item in navigation.menu" :key="item.path" :index="item.path">{{ item.title }}</el-menu-item> -->
            <el-submenu index="ecosystem">
              <template slot="title">Ecosystem</template>
              <el-menu-item v-for="item in navigation.ecosystem" :key="item.url" :index="item.url">
                <a :href="item.url" target="_blank">{{ item.title }}</a>
              </el-menu-item>
            </el-submenu>
          </el-menu>

          <!-- version menu -->
          <el-menu :default-active="navigation.selected.version" mode="horizontal" @select="navSelectVersion">
            <el-submenu index="version-menu" class="version-menu">
              <template slot="title">{{ navigation.selected.version }}</template>
              <el-menu-item v-for="version in navigation.versions" :key="version" :index="version">{{ version }}</el-menu-item>
            </el-submenu>
          </el-menu>
        </div>
      </div>
    </div>

    <div class='body center'>

      <!-- left navigation -->
      <div class='aside-left'>
        <ul>
          <li v-for="navItem in navigation.menu[navigation.selected.version]" :key="navItem.path" :class="navItemClass(navItem, null)">
            <nuxt-link :to="navItem.path">{{ navItem.title }}</nuxt-link>
            <ul v-if="navItem.children && navigation.selected.top === navItem.path">
              <li v-for="child in navItem.children" :key="child.path" :class="navItemClass(child, navItem)">
                <nuxt-link :to="child.path">{{ child.title }}</nuxt-link>
              </li>
            </ul>
          </li>
        </ul>
      </div>

      <div class='content'>
<!--        <el-alert v-if="error" :title="error.title" type="error" :description="error.description" show-icon :closable="false">-->
<!--        </el-alert>-->
        <h1 v-if="doc">{{ doc.title }}</h1>
        <nuxt-content :document="doc" />
      </div>
      <!--<div class='aside-right'>Aside</div>-->
    </div>

    <div class="footer">
      <p>Footer</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import Search from '@/components/Search'

const storageKey = 'openapi-enforcer-middleware'
const store = {
  data: {},

  get (key) {
    const data = localStorage ? localStorage.getItem(storageKey) : getCookie(storageKey)
    if (data) this.data = JSON.parse(data)
    return data ? this.data[key] : undefined
  },

  remove (key) {
    delete this.data[key]
    this.save()
  },

  set (key, value) {
    this.data[key] = value
    this.save()
  },

  save () {
    if (localStorage) {
      localStorage.setItem(storageKey, JSON.stringify(this.data))
    } else if (document) {
      const expires = (new Date(Date.now() + 5184000000)).toUTCString() // 60 days from today
      document.cookie = storageKey + '=' + encodeURIComponent(JSON.stringify(this.data)) + '; expires=' + expires
    }
  }
}

export default {
  components: {
    Search
  },

  // async beforeRouteEnter  (to, from, next) {
  //   await this.loadPageData(to.path)
  //   next()
  // },

  // async beforeRouteUpdate (to, from, next) {
  //   await loadPageData(this, this.$content, to.path)
  //   next()
  // },

  async asyncData({$content, params}) {
    console.info('INIT')

    const navigation = {
      drawer: true,
      selected: {
        path: '',
        top: '',
        version: store.get('version') || '1.x'
      },
      ecosystem: [
        { title: 'OpenAPI Enforcer (core)', url: 'https://byu-oit.github.io/openapi-enforcer' },
        { title: 'CLI', url: 'a' },
        { title: 'Express Middleware', url: 'b' },
        { title: 'BigInt', url: 'c' },
        { title: 'Multer', url: 'd' }
      ],
      secondary: null,
      menu: [],
      versions: ['1.x', '2.x']
    }

    const context = {
      currentPath: '',
      doc: null,
      err: null,
      navigation,
      query: ''
    }

    const { data } = await axios.get('/navigation.json')
    navigation.menu = data

    await loadPageData(context, $content, '/' + params.pathMatch)

    return context

    // try {
    //   const doc = await $content(params.pathMatch || 'index').fetch()
    //   return {
    //     doc,
    //     err: null,
    //     navigation,
    //     query: ''
    //   }
    // } catch (err) {
    //   return {
    //     doc: null,
    //     err,
    //     navigation,
    //     query: ''
    //   }
    // }
  },

  computed: {
  },

  methods: {
    navItemClass (item, parentItem) {
      const path = this.navigation.selected.path
      const prefix = '/' + path.split('/')[1]

      const classes = []
      if (!parentItem) {
        classes.push('parent-level-nav')

        if (item.path === path) {
          const children = item.children || []
          if (!children.find(v => v.path === path)) {
            classes.push('active-nav')
          } else {
            classes.push('active-group')
          }
        }
        if (path !== '/' && item.path.indexOf(prefix) === 0) {
          classes.push('active-group')
        }
      } else {
        classes.push('child-level-nav')
        if (item.path === path) classes.push('active-nav')
        if (path !== '/' && item.path.indexOf(prefix) === 0) classes.push('active-group')
      }

      return classes.join(' ')
    },
    navSelectPage(key, keyPath) {
      this.$router.push(key)
    },
    navSelectVersion(key, keyPath) {
      this.navigation.selected.version = key
      store.set('version', key)
    }
  }
}

function getCookie(cname) {
  const name = cname + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

async function loadPageData (context, $content, key) {
  try {
    const nav = context.navigation
    const filePath = getFilePath(context, key)

    // avoid running again for current path
    // const was = context.currentPath
    // if (context.currentPath === key) return
    // console.log('load ' + key + ' was ' + was)
    // context.currentPath = key

    // reset navigation selection
    nav.selected.top = '/' + key.split('/')[1]
    nav.selected.path = key
    // context.navigation.secondary = null
    if (!filePath) {
      context.doc = undefined
      return
    }

    const menu = nav.menu[nav.selected.version]
    const topItemsLength = menu.length
    for (let i = 0; i < topItemsLength; i++) {
      const top = menu[i]
      console.info('i', i, key, top)
      if (top.children) {
        const length = top.children.length
        for (let j = 0; j < length; j++) {
          const child = top.children[j]
          console.log(j, key, child)
          if (child.path === key) {
            // nav.selected.top = top.path
            const secondary = top.children.map(v => {
              return {
                depth: 1,
                path: v.path,
                title: v.title
              }
            })

            const doc = await fetchDocument($content, filePath)
            const toc = doc.toc.map(v => {
              return {
                depth: v.depth,
                path: key + '#' + v.id,
                title: v.text
              }
            })
            secondary.splice(j + 1, 0, ...toc)
            nav.secondary = secondary
            context.doc = doc

            return
          }
        }
      }
      if (top.path === key) {
        // nav.selected.top = key
        nav.secondary = null

        const doc = await fetchDocument($content, filePath)
        context.doc = doc

        return
      }

      // if (!context.doc) {
      //   context.error = {
      //     title: '404',
      //     description: 'Page not found: ' + key
      //   }
      // }
    }
  } catch (err) {
    console.error(err.stack)
  }
}

function getFilePath (context, key) {
  const nav = context.navigation
  const found = find(nav.menu[nav.selected.version], key)
  return found ? '/' + nav.selected.version + found : ''

  function find (items) {
    const length = items.length
    for (let i = 0; i < length; i++) {
      const item = items[i]
      const hasChildren = item.children && item.children.length
      if (item.path === key) {
        return hasChildren ? key + '/index' : key
      } else if (hasChildren) {
        let found = find (item.children)
        if (found) return found
      }
    }
  }
}

async function fetchDocument ($content, path) {
  console.log(path)
  let doc = await $content(path).fetch()
  if (Array.isArray(doc)) doc = doc.find(v => path === v.path.replace(/\/index$/, ''))
  if (doc && !doc.toc) doc.toc = []
  console.log(doc)
  return doc
}

</script>

<style lang="stylus">

</style>
