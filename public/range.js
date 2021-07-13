let inputSegmentValue = document.getElementById('segmentValue')
let inputRange = document.getElementById('segmentSize')
inputRange.addEventListener("input", (e) => {
  inputSegmentValue.innerText = e.target.value
})