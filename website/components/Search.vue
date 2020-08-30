<template>
  <el-autocomplete
    popper-class="search"
    v-model="query"
    :fetch-suggestions="querySearch"
    :trigger-on-focus="false"
    type="search"
    placeholder="Search"
    @select="handleSelect">
    <!-- <i
      class="el-icon-search el-input__icon"
      slot="suffix"
      @click="handleIconClick">
    </i> -->
    <template slot-scope="{ item }">
      <div class="title">{{ item.title }}</div>
      <div class="description">{{ item.description }}</div>
    </template>
  </el-autocomplete>
</template>

<script>
export default {
  data () {
    return {
      query: ''
    }
  },

  props: ['version'],

  methods: {
    handleSelect (item) {
      console.log(item)
    },
    async querySearch (query, callback) {
      console.log(query)
      if (!query) {
        return callback([])
      } else {
        const startsWith = '/' + this.version + '/'
        let results = await this.$content(null, { deep: true })
          .search(query)
          // .only(['title', 'description', 'path'])
          .fetch()
        results = results.filter(v => v.path.indexOf(startsWith) === 0)
        console.log(results.map(v => JSON.parse(JSON.stringify(v))))
        callback(results)
      }
    }
  }
}
</script>

<style>

.search .title {
  font-weight: bold;
  line-height: 1.2em;
  padding: .7em 0 0 0;
}

.search .description {
  font-size: 90%;
  opacity: .8;
  line-height: 1.2em;
  padding: .7em 0 0 0;
  margin-bottom: 1em;
  white-space: normal;
  /* border-bottom: 1px solid #EEE; */
  max-height: 4.1em;
  text-overflow: ellipsis;
}
</style>
