<template>
  <div class="tab-group">
    <div class="tabs">
      <div v-for="tab in tabs" :key="tab" class="tab" @click="setActive(tab)" :class="{ active: active === tab }">{{ tab }}</div>
    </div>
    <div class="content" ref="content">
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  data () {
    const active = this.tabs[0]
    return {
      active
    }
  },

  mounted () {
    this.setActive(this.active)
  },

  props: ['tabs'],

  methods: {
    setActive (tab) {
      this.active = tab

      const elements = this.$refs.content.children
      const length = elements.length
      for (let i = 0; i < length; i++) {
        const el = elements[i]
        if (el.getAttribute('data-tab') === tab) {
          el.style.display = 'block'
        } else {
          el.style.display = 'none'
        }
      }
    }
  }
}
</script>

<style>

.tab-group {
  border-radius: 2px;
  background: #322931;
}
.tab-group .tabs {
  background: #555;
  border-radius: 4px 4px 0 0;
  padding: 5px 0 0 5px;
}
.tab-group .tabs .tab {
  display: inline-block;
  padding: 5px 15px;
  color: white;
  cursor: pointer;
}
.tab-group .tabs .tab.active {
  border-radius: 2px 2px 0 0;
  background: #322931;
}
.page .body .content .tab-group .content {
  padding: 10px;
}
.page .body .content .tab-group .content .nuxt-content-highlight pre {
  border: none;
}

</style>
