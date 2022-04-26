class Editor {
    constructor(game, saveLocation) {
        this.game = game
        this.selectedBeat = 0
        this.saveLocation = saveLocation || null
    }

    drawChart(select) {
        $('#chart').empty()
        this.deselect()

        let allNotes = this.game.getAllNotes()
        let lastBeat = Math.ceil(Math.max(...allNotes.map(x => x.beat))) // get highest beat
        let lastSubdiv = this.game.conductor.getSubdivision(1)

        for (let i = 1; i < lastBeat; i++) {
            let thisBeat = allNotes.filter(x => Math.floor(x.beat) == i)
            let subdivBeats = thisBeat.map(x => {
                let bpmChange = this.game.conductor.bpmChanges.find(z => x.beat > 1 && z.beat == x.beat)
                let subdivChange = this.game.conductor.subdivisionChanges.find(z => x.beat > 1 && z.beat == x.beat)
                let noteElement = $(`<div class="note" beat="${x.beat}" note="${x.note || "-"}">${this.emojiElement(x.note)}</div>"`)
                if (x.note && x.data.auto) noteElement.addClass("auto")
                if (bpmChange) noteElement.attr("bpm", bpmChange.bpm)
                if (subdivChange) noteElement.attr("subdivision", subdivChange.subdivision)
                return noteElement.prop("outerHTML")
            }).join("")

            if (thisBeat.length != lastSubdiv) {
                $('#chart').append("<hr>")
                lastSubdiv = thisBeat.length
            }
            let isMissingNotes = this.game.notes.filter(x => Math.floor(x.beat) == i).length != thisBeat.filter(x => x.note && x.note != "-").length
            $('#chart').append(`<div class="beat${isMissingNotes ? " missingNotes" : ""}" num="${i}">${subdivBeats}</div>`)
        }
        if (select) this.selectBeat(select)
        this.game.updatePath()
    }

    emojiElement(emoji) {
        let foundIcon = EMOJIS.notes[emoji]
        return `<div class="emoji"><p>${foundIcon ? foundIcon[0] : ""}</p></div>`
    }

    // change the arrow on a certain beat
    setNote(note, beat, noReset=true) {
        if (!beat) return this.deselect()
        beat = this.game.conductor.roundToSubdiv(beat)
        let deleteNote = note == "-" || !note
        let foundNote = this.game.notes.find(x => x.beat == beat)
        
        if (foundNote) {
            foundNote.skipped = true
            if (foundNote.arrow == note) return
            else if (deleteNote) this.game.notes = this.game.notes.filter(x => x.beat != foundNote.beat)
            else foundNote.arrow = note
        }
        else if (deleteNote) return
        else {
            let newNote = new Note(this.game, {beat, arrow: note})
            newNote.skipped = true
            this.game.notes.push(newNote)
            this.game.notes = this.game.notes.sort((a, b) => a.beat - b.beat)
        }

        this.updateBeat(beat, noReset)
    }

    updateBeat(beat, noReset) {
        this.drawNote(beat)
        if (!noReset && this.game.active) this.game.restart()
    }

    stopPlaytest() {
        $('.highlighted').removeClass('highlighted') // remove editor highlighting
        if (!this.selectedBeat) this.deselect()
    }
    
    scrollToBeat(beat) {
        let foundElement = $(`.beat[num="${Math.floor(beat)}"]`)
        if (!foundElement.length) return
        $('#chart').scrollTop($('#chart').scrollTop() + foundElement.offset().top - (foundElement.height() * 7))
    }

    highlightBeat(beat) {
        $('.highlighted').removeClass('highlighted')
        $(`.beat[num="${Math.floor(beat)}"]`).addClass('highlighted')
        $(`.note[beat="${this.game.conductor.roundToSubdiv(beat)}"]`).addClass('highlighted')
        this.displayBeat(beat)
    }

    updateSongInfo() {
        $('#chartName').val(this.game.chartName)
        $('#songFilename').val(this.game.conductor.filename)
        $('#startingBPM').val(this.game.conductor.bpmChanges[0].bpm)
        $('#startingSubdiv').val(this.game.conductor.subdivisionChanges[0].subdivision)
        $('#songOffset').val(this.game.conductor.offset * 1000)
        $('#startingVolume').val(this.game.conductor.music.volume() * 100)
        $('#currentSpeed').html(this.game.conductor.speed.toFixed(1))
    }

    displayBeat(beat) {
        if (!beat) {
            $('#currentBeat').html("-")
            $('#currentTime').html("-")
            $('#currentBPMChange').val("")
            $('#currentSubdivChange').val("")
            $('#currentArrow').val("-")
            $('#currentBPMChange').attr("placeholder", this.game.conductor.getBPM(1))
            $('#currentSubdivChange').attr("placeholder", this.game.conductor.getSubdivision(1))

            $('#noteInfo').hide()
            $('#songInfo').show()
            return
        }
        let roundBeat = Math.floor(beat)
        let subdiv = this.game.conductor.getSubdivision(beat)

        let foundArrow = this.game.notes.find(x => x.beat == beat)
        let arrowVal = foundArrow ? foundArrow.arrow : "-"
        $('#currentArrow').val(arrowVal)

        let foundBPMChange = this.game.conductor.bpmChanges.find(x => beat > 1 && x.beat == beat)
        $('#currentBPMChange').val(foundBPMChange ? foundBPMChange.bpm : "")
        $('#currentBPMChange').attr("placeholder", foundBPMChange ? "-" : this.game.conductor.getBPM(beat))

        let foundSubdivChange = this.game.conductor.subdivisionChanges.find(x => x.beat > 1 && x.beat == Math.floor(beat))
        $('#currentSubdivChange').val(foundSubdivChange ? foundSubdivChange.subdivision : "")
        $('#currentSubdivChange').attr("placeholder", foundSubdivChange ? "-" : this.game.conductor.getSubdivision(beat))

        $('#currentBeat').html(subdiv == 1 ? roundBeat : `${roundBeat} + (${Math.round((beat - roundBeat) * subdiv)}/${subdiv})`)
        $('#currentTime').html(timestamp(this.game.conductor.getSecsFromBeat(beat)))

        $('#noteInfo').show()
        $('#songInfo').hide()
    }

    selectBeat(beat, element) {
        $('.selected').removeClass('selected') // remove current selected beat
        if (!beat || this.selectedBeat == beat) return this.deselect() // deselect
        this.selectedBeat = beat
        this.displayBeat(beat);
        let targetElement = element ? element : $(`.note[beat="${beat}"]`)
        targetElement.addClass('selected')
    }

    deselect() {
        this.selectedBeat = 0
        if (!this.game.active) this.displayBeat(0) 
    }

    confirmBPMChange() {
        if (!this.selectedBeat) return
        let newBPM = $('#currentBPMChange').val() ? Number($('#currentBPMChange').val()) : this.game.conductor.getBPM(this.game.conductor.getPreviousBeat(this.selectedBeat))
        if (this.selectedBeat == 1) return this.setStartBPM(newBPM)
        let success = this.game.conductor.addBPMChange(this.selectedBeat, newBPM)
        if (success) this.drawChart(this.selectedBeat)
        if ($('#currentBPMChange').val()) $('#currentBPMChange').val(this.game.conductor.getBPM(this.selectedBeat))
    }

    confirmSubdivChange() {
        if (!this.selectedBeat) return
        let newSubdiv = $('#currentSubdivChange').val() ? Number($('#currentSubdivChange').val()) : this.game.conductor.getSubdivision(this.game.conductor.getPreviousBeat(this.selectedBeat))
        if (Math.floor(this.selectedBeat) == 1) return this.setStartSubdiv(newSubdiv)
        let success = this.game.conductor.addSubdivChange(this.selectedBeat, newSubdiv)
        if (success) this.drawChart(Math.floor(this.selectedBeat))
        if ($('#currentSubdivChange').val()) $('#currentSubdivChange').val(this.game.conductor.getSubdivision(this.selectedBeat))
    }

    setStartBPM(num) {
        let newBPM = Number(num || $('#startingBPM').val() || $('#startingBPM').attr('placeholder'))
        let currentStartBPM = this.game.conductor.bpmChanges.find(x => x.beat == 1)
        if (!newBPM) return $('#startingBPM').val(currentStartBPM.bpm)
        else {
            currentStartBPM.bpm = clamp(newBPM, 1, CONFIG.bpmLimit)
            this.game.conductor.organizeBPMChanges()
            this.drawChart()
        }
        this.conductor.updateActionSecs()
        this.updateSongInfo()
    }

    setStartSubdiv(num) {
        let newSubdiv = Number(num || $('#startingSubdiv').val() || $('#startingSubdiv').attr('placeholder'))
        let currentStartSubdiv = this.game.conductor.subdivisionChanges.find(x => x.beat == 1)
        if (!newSubdiv) return $('#startingSubdiv').val(currentStartSubdiv.bpm)
        else {
            currentStartSubdiv.subdivision = clamp(newSubdiv, 1, CONFIG.subdivLimit)
            this.game.conductor.organizeSubdivChanges()
            this.drawChart()
        }
        this.updateSongInfo()
    }

    setOffset() {
        let newOffset = Number($('#songOffset').val() || $('#startingSubdiv').attr('placeholder'))
        if (!newOffset) return $('#songOffset').val(this.game.conductor.offset * 1000)
        else this.game.conductor.offset = clamp(-20000, 20000, newOffset) / 1000
        this.game.conductor.updateActionSecs()
        this.updateSongInfo()
    }

    setStartVolume() {
        let newVolume = Number($('#startingVolume').val()) || CONFIG.defaultSongVolume
        if (!newVolume) return $('#startingVolume').val(this.game.conductor.music.volume() * 100)
        else this.game.conductor.setVolume(newVolume)
        this.updateSongInfo()
    }

    setSongFilename() {
        let dotSplit = this.game.conductor.filename.split(".") // .at(-1) isnt supported in a lot of browsers :pensive:
        let currentExtension = "." + dotSplit[dotSplit.length - 1]
        let newFilename = safeFilename($('#songFilename').val()).slice(0, 64) || "song"
        if (!dotSplit[1]) newFilename = newFilename.replace(/\./g, "")
        else if (!newFilename.endsWith(currentExtension)) newFilename += currentExtension
        $('#songFilename').val(newFilename)
        this.game.conductor.filename = newFilename
    }

    setSong(songData) {
        let reader = new FileReader()
        reader.onload = async function() { game.conductor.setSong(reader.result, songData.name) }
        reader.readAsDataURL(songData)
        this.drawChart()
    }

    // visually update the beat
    drawNote(beat) {
        let foundNote = this.game.notes.find(x => x.beat == beat) || {}
        let noteElement = $(`.note[beat="${beat}"]`)
        noteElement.html(this.emojiElement(foundNote.arrow)).attr('note', foundNote.arrow || "-")
        if (foundNote.auto) noteElement.addClass('auto')
        else noteElement.removeClass('auto')
        this.game.updatePath()
    }

    // when the song is loaded
    ready() {
        this.drawChart()
        $('#loadingMenu').hide()
        $('#editor').show()
    }

    chartName(ext) {
        return (safeFilename($('#chartName').val()) || "untitled") + (ext ? ".urlx" : "")
    }

    async saveChart() {
        if (!browserDoesntSuck) return alert("Your browser doesn't support quick saving! Switch to a supported browser (Chrome, Edge, etc) or save by exporting the chart to a zip.")
        if (!this.saveLocation) this.saveLocation = await window.showDirectoryPicker().catch(() => null)
        if (!this.saveLocation) return // if save popup was closed

        $('#saveBtn').hide()
        $('#saving').show()
                       
        let songFile = this.game.conductor.filename

        if (!this.game.conductor.noSong) {
            let foundSong = await this.saveLocation.getFileHandle(songFile).catch(() => null)
            if (!foundSong) await this.saveLocation.getFileHandle(songFile, {create: true}).then(songFile => {
                songFile.createWritable().then(async writable => {
                    let blobData = await fetch(this.game.conductor.music._src).then(res => res.blob())
                    writable.write(blobData).then(() => writable.close()).catch((e) => alert(e))
                }).catch(() => {})
            })
        }

        await this.saveLocation.getFileHandle(this.chartName(true), {create: true}).then(chartFile => {
            chartFile.createWritable().then(async writable => {
                writable.write(this.game.chartString()).then(() => {
                    writable.close()
                    $('#saveBtn').show()
                    $('#saving').hide()
                }).catch((e) => alert(e))
            }).catch(() => {})
        })
    }

    zipChart() {
        $('#exportBtn').hide()
        $('#exporting').show()
        let chartName = this.chartName()
        let zipFile = new JSZip();
        zipFile.file(`${chartName}.urlx`, this.game.chartString())
        if (!this.game.conductor.noSong) zipFile.file(this.game.conductor.filename, this.game.conductor.music._src.split(",")[1], {base64: true})
        zipFile.generateAsync({type: "blob"}).then(async blob => {

            // the cool modern way
            if (browserDoesntSuck) {
                let saveOptions = {suggestedName: chartName + ".urlzip", types: [{description: "Zip file", accept: {"application/zip": [".urlzip", ".zip"]}}] }
                window.showSaveFilePicker(saveOptions)
                .then(selectedFile => {
                    selectedFile.createWritable().then(writable => {
                        writable.write(blob).then(() => writable.close()).catch(() => {})
                    }).catch(() => {})
                }).catch(() => {})
            }

            // the lame old way
            else {
                let downloader = document.createElement('a');
                downloader.href = URL.createObjectURL(new Blob([blob], {type: 'application/zip'}))
                downloader.setAttribute("download", chartName + ".urlzip");
                document.body.appendChild(downloader);
                downloader.click();
                document.body.removeChild(downloader);
            }

            $('#exportBtn').show()
            $('#exporting').hide()
        })
    }

    loadFromZip() {

    }
}

//=============================//

// editor note selection
$(document).on('click', '.note', function () { 
    let beatNum = +$(this).attr('beat')
    game.editor.selectBeat(beatNum, $(this))
})

// editor note right click
$(document).on('contextmenu', '.note', function (e) { 
    e.preventDefault()
    let beatNum = +$(this).attr('beat')
    game.notes.filter(x => !x.isBomb() && x.beat == beatNum).forEach(x => x.auto = !x.auto)
    game.editor.updateBeat(beatNum)
})

// toggle ui
let chartVisible = true
function toggleChartVisiblity(visibility) {
    chartVisible = visibility === undefined ? !chartVisible : visibility
    $('.chartVisible').toggle(chartVisible);
    $('.chartHidden').toggle(!chartVisible)
    if (!chartVisible) game.updateStats()
}

// i'm lazy
$('#currentYear').text(new Date().getFullYear())

// mobile
let mobile = ( /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ) 
if (mobile) $('#mobileWarning').show()

// hitsound list
let hitsoundOptions = CLAPS.map(x => `<option value="${x.file}">${x.name}</option>`).join("")
$('.hitsoundList').append(hitsoundOptions)