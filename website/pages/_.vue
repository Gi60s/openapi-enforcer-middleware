<template>
  <div class='page'>
    <div class="overlay" :class="{ 'show-overlay': overlay }" @click="overlay = false"></div>

    <div class='header'>
      <div class="center">
        <!-- site title / header -->
        <div class="site-header">
          <nuxt-link :to="'/' + version">
            <h1>OpenAPI Enforcer Middleware</h1>
          </nuxt-link>
        </div>
        <div class="spacer"></div>

        <!-- mobile view menu button -->
        <el-button class="mobile-menu-button" icon="el-icon-menu" @click="overlay = !overlay"></el-button>

        <div class="site-navigation">
          <search v-if="version" :search-function="runSearch" :version="version" />

          <!-- top menu -->
          <el-menu mode="horizontal">
            <!-- <el-menu-item v-for="item in navigation.menu" :key="item.path" :index="item.path">{{ item.title }}</el-menu-item> -->
            <el-submenu index="ecosystem">
              <template slot="title">Ecosystem</template>
              <el-menu-item v-for="item in navigation.ecosystem" :key="item.url" :index="item.url">
                <a class="ecosystem" :href="item.url" target="_blank">{{ item.title }}</a>
              </el-menu-item>
            </el-submenu>
          </el-menu>

          <!-- version menu -->
          <el-menu v-if="version" :default-active="version" mode="horizontal" @select="navSelectVersion">
            <el-submenu index="version-menu" class="version-menu">
              <template slot="title">{{ version }}</template>
              <el-menu-item v-for="ver in navigation.versions" :key="ver" :index="ver">{{ ver }}</el-menu-item>
            </el-submenu>
          </el-menu>
        </div>
      </div>
    </div>

    <div class='body center'>

      <!-- left navigation -->
      <div v-if="version" class='aside-left' :class="{ 'show-navigation': overlay }">

        <!-- mobile navigation -->
        <div class="mobile-content">

          <!-- mobile search -->
          <div class="mobile-menu-group" :class="{ 'active-menu': mobileMenu === 'Search' }">
            <div class="mobile-menu-button" @click="setMobileMenu('Search')">Search</div>
            <div class="mobile-menu-group-content mobile-menu-search">
              <el-input id="mobile-search-input" placeholder="Search" v-model="mobileSearch" clearable></el-input>
              <div class="mobile-search-content">
                <p v-if="mobileSearch === ''">Search above.</p>
                <p v-if="mobileSearch !== '' && mobileSearchResults.length === 0">No results.</p>
                <div class="mobile-search-result" @click="$router.push(item.path)" v-for="(item, index) in mobileSearchResults" :key="index">
                  <div class="mobile-search-result-title">{{item.title}}</div>
                  <div class="mobile-search-result-blurb">{{item.blurb}}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- mobile site navigation -->
          <div class="mobile-menu-group" :class="{ 'active-menu': mobileMenu === 'Site Navigation' }">
            <div class="mobile-menu-button" @click="setMobileMenu('Site Navigation')">Site Navigation</div>
            <div class="mobile-menu-group-content">
              <ul>
                <li v-for="navItem in navigation.menu[version]" :key="navItem.path" :class="navItemClass(navItem, null)">
                  <nuxt-link v-if="!navItem.children" :to="'/' + version + navItem.path">{{ navItem.title }}</nuxt-link>
                  <div class="nav-group" v-else>
                    <div class="nav-group-title">{{ navItem.title }}</div>
                    <ul v-if="navItem.children">
                      <li v-for="child in navItem.children" :key="child.path" :class="navItemClass(child, navItem)">
                        <nuxt-link :to="'/' + version + child.path">{{ child.title }}</nuxt-link>
                      </li>
                    </ul>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <!-- mobile table of contents -->
          <div v-if="doc && doc.toc && !doc.noRightColumn && doc.toc.length" class="mobile-menu-group" :class="{ 'active-menu': mobileMenu === 'Page Content' }">
            <div class="mobile-menu-button" @click="setMobileMenu('Page Content')">Page Content</div>
            <div class="mobile-menu-group-content">
              <ul>
                <li v-for="link of doc.toc" :key="link.id" :class="{ 'toc2': link.depth === 2, 'toc3': link.depth === 3 }">
                  <NuxtLink :to="'#' + link.id">{{ link.text }}</NuxtLink>
                </li>
              </ul>
            </div>
          </div>

          <!-- mobile version menu -->
          <div class="mobile-menu-group" :class="{ 'active-menu': mobileMenu === 'Docs Version' }">
            <div class="mobile-menu-button" @click="setMobileMenu('Docs Version')">Docs Version</div>
            <div class="mobile-menu-group-content">
              <ul>
                <li v-for="version in navigation.versions" :key="version">
                  <nuxt-link :to="'/' + version">{{version}}</nuxt-link>
                </li>
              </ul>
            </div>
          </div>

          <!-- mobile ecosystem -->
          <div class="mobile-menu-group" :class="{ 'active-menu': mobileMenu === 'Ecosystem' }">
            <div class="mobile-menu-button" @click="setMobileMenu('Ecosystem')">Ecosystem</div>
            <div class="mobile-menu-group-content">
              <a class="ecosystem" v-for="item in navigation.ecosystem" :key="item.url" :href="item.url" target="_blank">{{ item.title }}</a>
            </div>
          </div>
        </div>

        <ul class="site-navigation">
          <li v-for="navItem in navigation.menu[version]" :key="navItem.path" :class="navItemClass(navItem, null)">
            <nuxt-link v-if="!navItem.children" :to="'/' + version + navItem.path">{{ navItem.title }}</nuxt-link>
            <div class="nav-group" v-else>
              <div class="nav-group-title">{{ navItem.title }}</div>
              <ul v-if="navItem.children">
                <li v-for="child in navItem.children" :key="child.path" :class="navItemClass(child, navItem)">
                  <nuxt-link :to="'/' + version + child.path">{{ child.title }}</nuxt-link>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </div>

      <div class='content'>

        <!-- out of date docs warning -->
        <!-- <el-alert v-if="version && version !== '2.x'" title="There is a Newer Version!" type="warning" :closable="false">
          There is a new version of this library available with new documentation. If you are looking
          for documentation for version {{ version }} then you are in the right place,
          otherwise check out the
          <span class="page-link" @click="navSelectVersion('2.x')">latest documentation</span>.
        </el-alert> -->

        <!-- alpha release warning -->
        <el-alert v-if="version && version === '2.x'" title="Alpha Release" type="warning" :closable="false">
          Version 2.x of the middleware is functional, but not yet fully stable. There may be some minor breaking changes
          in the library before the final 2.x release. If you're interested in the current latest release then check out
          <span class="page-link" @click="navSelectVersion('1.x')">1.x documentation</span>.
        </el-alert>

        <h1 v-if="doc">{{ doc.title }}</h1>

        <nuxt-content :document="doc" />
      </div>

      <div class='aside-right' v-if="doc && doc.toc && !doc.noRightColumn">
        <div v-if="doc.toc.length">
          <h4>Page Content</h4>
          <div class="toc">
            <ul>
              <li v-for="link of doc.toc" :key="link.id" :class="{ 'toc2': link.depth === 2, 'toc3': link.depth === 3 }">
                <NuxtLink :to="'#' + link.id">{{ link.text }}</NuxtLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>
        <a href="https://www.npmjs.com/package/openapi-enforcer-middleware" target="_blank">NPM</a>
        |
        <a href="https://github.com/byu-oit/openapi-enforcer-middleware" target="_blank">Github</a>
      </div>
      <div class="edit-this-page">
        Caught a mistake or want to contribute to the documentation?
        <a :href="'https://github.com/byu-oit/openapi-enforcer-middleware/tree/master/website/content/' + editPath" target="_blank">
          Edit this page on Github.
        </a>
      </div>
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

let navigationMenu = null

export default {
  components: {
    Search
  },

  // async beforeRouteEnter  (to, from, next) {
  //   if (to.fullPath === '/') {
  //     if (!navigationMenu) {
  //       const { data } = await axios.get('/navigation.json')
  //       navigationMenu = data
  //     }
  //
  //     // let version = store.get('version')
  //     // if (version && !navigationMenu[version]) {
  //     //   store.set('version', '')
  //     //   version = ''
  //     // }
  //     // if (version) return next('/' + version + '/')
  //   }
  //   next()
  // },

  // async beforeRouteUpdate (to, from, next) {
  //   await loadPageData(this, this.$content, to.path)
  //   next()
  // },

  async asyncData({ $config, $content, $router, params }) {
    const { baseUrl } = $config
    const [ version ] = params.pathMatch.split('/')
    if (version) {
      store.set('version', version)
    }

    if (!navigationMenu) {
      const { data } = await axios.get(baseUrl + '/navigation.json')
      navigationMenu = data
    }

    // await loadPageData(context, version, $content, '/' + path.join('/'))
    const path = params.pathMatch || '/'
    let doc = null
    let isIndex = path === '/'
    try {
      doc = await $content(path === '/' ? 'index' : path).fetch()
    } catch (e) {
      isIndex = true
      doc = await $content(path, 'index').fetch()
    }
    if (Array.isArray(doc)) {
      const matchPath = '/' + path.replace(/^\//, '').replace(/\/$/, '')
      doc = doc.filter(d => {
        const p = d.path.replace(/\/index$/, '')
        return p === matchPath
      })[0]
    }

    return {
      baseUrl,
      editPath: path.replace(/\/$/, '') + (isIndex && doc ? '/index' : '') + '.md',
      doc,
      navigation: {
        drawer: true,
        selected: {
          path: '',
          top: '',
          version
        },
        ecosystem: [
          { title: 'OpenAPI Enforcer (core)', url: 'https://byu-oit.github.io/openapi-enforcer' },
          { title: 'CLI', url: 'a' },
          { title: 'Express Middleware', url: 'b' },
          { title: 'BigInt', url: 'c' },
          { title: 'Multer', url: 'd' }
        ],
        menu: navigationMenu,
        versions: ['1.x', '2.x']
      },
      mobileMenu: 'Site Navigation',
      mobileSearch: '',
      mobileSearchResults: [],
      overlay: false,
      query: ''
    }
  },

  computed: {
    version () {
      const path = this.$route.fullPath.replace(/^\//, '')
      const [ version ] = path.split('/')
      return version
    }
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
    navSelectVersion(key, keyPath) {
      this.$router.push('/' + key)
      store.set('version', key)
    },
    setMobileMenu(key) {
      this.mobileMenu = key
      if (key === 'Search') {
        setTimeout(() => document.getElementById('mobile-search-input').focus(), 50)
      } else {
        this.mobileSearch = ''
      }
    },
    async runSearch (query, callback) {
      if (!query) {
        return callback([])
      } else {
        const startsWith = '/' + this.version + '/'
        let results = await this.$content(null, { deep: true })
          .search(query)
          .only(['title', 'description', 'path', 'tags', 'toc'])
          .fetch()

        // filter results to the current version
        results = results.filter(v => v.path.indexOf(startsWith) === 0)

        // score search results and create blurbs
        const q = query.toLowerCase()
        results.forEach(result => {
          let score = 0
          let blurb = ''
          let realPath = result.path

          // extra points if it's the page title
          const title = result.title.toLowerCase()
          const index = title.indexOf(q)
          if (title === q) {
            score += 6
          } else if (index !== -1) {
            score += 4
          }
          if (index === 0 || title[index - 1] === ' ') score += 2

          // extra points for being in table of contents
          result.toc.forEach(toc => {
            const text = toc.text.toLowerCase()
            const index = text.indexOf(q)
            if (text === q) {
              score += toc.depth * 3
              realPath = result.path + '#' + toc.id
              blurb = toc.text
            } else if (index !== -1) {
              score += toc.depth
              if (index === 0) blurb = toc.text
            }

            // an extra point if the match is the start of a word
            if (index === 0 || text[index - 1] === ' ') score++
          })

          // extra points for matching a tag
          if (result.tags) {
            result.tags.split(/ +/).forEach(tag => {
              const text = tag.toLowerCase()
              const index = text.indexOf(q)
              if (text === q) {
                score += 3
              } else if (index !== -1) {
                score += 2
              }
            })
          }

          result.score = score
          result.blurb = blurb || result.description
          result.realPath = realPath
        })

        // sort results to best matches
        results.sort((a, b) => {
          return a.score > b.score ? -1 : 1
        })

        // limit results to 7 or fewer
        results = results.slice(0, 7)

        console.log('search results', results.map(v => JSON.parse(JSON.stringify(v))))
        callback(results)
      }
    }
  },

  watch: {
    mobileSearch (newValue, oldValue) {
      this.runSearch(newValue, results => {
        this.mobileSearchResults = results
      })
    },

    overlay (newValue) {
      if (newValue === true) {
        this.mobileMenu = 'Site Navigation'
      }
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

</script>

<style lang="stylus">

</style>
