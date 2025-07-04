const removeOneTrust = () => {
    let oneTrustObserver = new MutationObserver((mutationsList, observer) => {
        for (let mutation of mutationsList) {
            if (mutation.type === "childList") {
                for (let node of mutation.addedNodes) {
                    if (node.id === "onetrust-consent-sdk") {
                        node.remove()
                        observer.disconnect()
                    }
                }
            }
        }
    })
    oneTrustObserver.observe(document.body, { childList: true, subtree: true })
}

const removeStickyBannerAds = () => {
    document.querySelectorAll("div[class*=StickyBannerAd]").forEach(el => el.remove())
}

const shrinkInreadContainers = () => {
    document
        .querySelectorAll("div[class*=InreadContainer]")
        .forEach(el => (el.style.minHeight = "0px"))
}

const removeApplePlayer = () => {
    document.querySelectorAll("div[class*=MediaPlayersContainer]").forEach(el => el.remove())
}

const removeFooter = () => {
    let appEl = document.getElementById("application")
    if (appEl && appEl.children.length > 1) appEl.lastChild.remove()
}

if (window != top) {
    removeOneTrust()
    removeStickyBannerAds()
    shrinkInreadContainers()
    removeApplePlayer()
    removeFooter()
}
