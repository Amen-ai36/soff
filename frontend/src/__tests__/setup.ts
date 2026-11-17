// jsdom 未实现 window.scrollTo；路由切换时的 scrollBehavior 会调用它。
window.scrollTo = () => {}
