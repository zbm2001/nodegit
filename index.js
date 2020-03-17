const {execSync} = require('child_process')
require('shelljs/global')

/**
 * 封装 exec 返回的结果，加入原命令字符串属性
 * @returns {Object}
 */
function exec2 (cmdStr) {
  let execResult = exec(cmdStr)
  execResult.cmdStr = cmdStr
  return execResult
}

// http://www.ruanyifeng.com/blog/2015/12/git-cheat-sheet.html

const cmds = {
  log: 'git log',
  tag: 'git tag',
  fetch: 'git fetch',
  pull: 'git pull',
  status: 'git status',
  branch: 'git branch',
  branchAll: 'git branch -a',
  currentBranch: 'git rev-parse --abbrev-ref HEAD', // git branch | awk '$1 == "*" {print $2}'
  currentId: 'git rev-parse HEAD',
  lastTag: 'git describe --tags `git rev-list --tags --max-count=1`',
  currentTag: 'git describe --tags --abbrev=0', // 获取当前分支基于的 tag 分支名
  describeTag: 'git describe --tags', // 获取当前分支基于的 tag 分支描述
  checkout: 'git checkout ',
  trackRemote: 'git branch --track ',
  revert: 'git revert',
  resetHard: 'git reset --hard '
}

// http://www.jb51.net/article/55442.htm
/**
 * $ git rev-parse --abbrev-ref HEAD
 * master
 * This should work with Git 1.6.3 or newer.
 *
 * In Git 1.8.1 you can use the git symbolic-ref command with the "--short" option:
 * $ git symbolic-ref HEAD
 * refs/heads/master
 * $ git symbolic-ref --short HEAD
 * master
 *
 * $ git rev-parse HEAD
 * 2148430b340137bd37431e69cdcc9e1346bb818d
 */

/**
 * 获取当前分支 id
 * @returns {String}
 */
function currentId () {
  let currentId = execSync(cmds.currentId, {encoding: 'utf8'}).trim()
  return currentId
}

/**
 * 获取当前分支名
 * @returns {String}
 */
function current () {
  let currentBranch = execSync(cmds.currentBranch, {encoding: 'utf8'}).trim()
  return currentBranch
}

/**
 * 获取当前分支基于的 tag 分支名。
 * 若最近的 tag 有多个无差异分支，返回最早版本，比如：
 * 1.1.0、1.1.1、1.1.2 为先后创建的多个无差异的 tag 分支，则会返回 1.1.0
 * @returns {String}
 */
function currentTag () {
  let currentTag = execSync(cmds.currentTag, {encoding: 'utf8'}).trim()
  return currentTag
}

/**
 * 获取当前分支基于的 tag 分支描述。
 * 若最近的 tag 有多个无差异分支，返回最早版本，比如：
 * 1.1.0、1.1.1、1.1.2 为先后创建的多个无差异的 tag 分支，则会返回 1.1.0
 * @returns {String}
 */
function describeTag () {
  let describeTag = execSync(cmds.describeTag, {encoding: 'utf8'}).trim()
  return describeTag
}

/**
 * 获取当前tags最新版本的分支名
 * @returns {String}
 */
function lastTag () {
  let lastTag = execSync(cmds.lastTag, {encoding: 'utf8'}).trim()
  return lastTag
}

/**
 * 执行 git 命令
 * @param {String} cmd
 * @param {String} gitCmdArg
 * @returns {Object}
 */
function gitCmd (cmd, gitCmdArg) {
  let cmdStr = cmds[cmd] + (gitCmdArg || '')
  return exec2(cmds[cmd])
}

/**
 * 拉取远程更新
 * @returns {Object} .code: 0 命令正确执行，其他为错误
 */
function fetch () {
  return exec2(cmds.fetch)
}

/**
 * 拉取当前分支更新
 * @returns {Object} .code: 0 命令正确执行，其他为错误
 */
function pull () {
  return exec2(cmds.pull)
}

/**
 * 切换到指定分支，并更新工作区
 * @param {String} branch
 * @returns {Object} .code: 0 命令正确执行，其他为错误
 */
function checkout (branch) {
  var cmdStr = cmds.checkout + branch
  return exec2(cmdStr)
}

/**
 * 新建一个分支，与指定的远程分支建立追踪关系
 * @param {String} branch
 * @param {String} remoteBranch
 * @returns {Object} .code: 0 命令正确执行，其他为错误
 */
function trackRemote (branch, remoteBranch) {
  remoteBranch = remoteBranch ? remoteBranch.indexOf('/') > -1 ? remoteBranch : 'origin/' + remoteBranch : branch
  var cmdStr = cmds.trackRemote + branch + ' ' + remoteBranch
  return exec2(cmdStr)
}

/**
 * 回退到某个历史版本
 * @param {String} branchId
 * @returns {Object} .code: 0 命令正确执行，其他为错误
 */
function revert () {
  var cmdStr = cmds.revert
  return exec2(cmdStr)
}

/**
 * 回退到某个历史版本
 * @param {String} branchId
 * @returns {Object} .code: 0 命令正确执行，其他为错误
 */
function resetHard (branchId) {
  var cmdStr = cmds.resetHard + branchId
  return exec2(cmdStr)
}

/**
 * 切换到指定分支，并更新工作区，若不存在指定分支，则做 trackRemote() 操作
 * @param {String} branch
 * @param {String} remoteBranch
 * @returns {Object} .code: 0 命令正确执行，其他为错误
 */
function update (branch, remoteBranch) {
  let record = {
    records: []
  }
  let execResult = fetch()
  pushRecord(record, execResult)
  if (execResult.code) return record
  execResult = checkout(branch)
  pushRecord(record, execResult)
  if (execResult.code) {
    execResult = trackRemote(branch, remoteBranch)
    pushRecord(record, execResult)
    if (execResult.code) return record
    execResult = checkout(branch)
    pushRecord(record, execResult)
    if (execResult.code) return record
  }
  execResult = pull()
  pushRecord(record, execResult)
  if (execResult.code) return record
  return record
}

/**
 * 切换至指定的分支，并回退到某个历史版本（从属于切换的分支）
 * @param {String} branch
 * @param {String} branchId
 * @returns {Object} .code: 0 命令正确执行，其他为错误
 */
function revertUpdate (branch, branchId) {
  let record = {
    records: []
  }
  let execResult = fetch()
  pushRecord(record, execResult)
  if (execResult.code) return record
  execResult = checkout(branch)
  pushRecord(record, execResult)
  if (execResult.code) {
    execResult = trackRemote(branch)
    pushRecord(record, execResult)
    if (execResult.code) return record
    execResult = checkout(branch)
    pushRecord(record, execResult)
    if (execResult.code) return record
  }
  execResult = resetHard(branchId)
  pushRecord(record, execResult)
  if (execResult.code) return record
  return record
}

const referenceTypes = Object.assign(Object.create(null), {
  object: !0,
  function: !0
})

function pushRecord (record, execResult) {
  let execRecord = {}
  // 保留最后一次的原始属性记录（覆盖之前的），每次记录则压入记录集
  Object.keys(execRecord).forEach(key => {
    if (execResult[key] == null || !referenceTypes[typeof execResult[key]]) {
      record[key] = execRecord[key] = execResult[key]
    }
  })
  record.records.push(execRecord)
}

/**
 * 测试命令返回值 git status
 *
 * 未提交的更改
 On branch upgrate
 Your branch is up-to-date with 'origin/upgrate'.
 Changes not staged for commit:
   (use "git add <file>..." to update what will be committed)
   (use "git checkout -- <file>..." to discard changes in working directory)

         modified:   publish/Config.js

 no changes added to commit (use "git add" and/or "git commit -a")
 *
 * 未推的本地提交
 On branch upgrate
 Your branch is ahead of 'origin/upgrate' by 1 commit.
   (use "git push" to publish your local commits)
 nothing to commit, working tree clean
 *
 * 已是最新
 On branch upgrate
 Your branch is up-to-date with 'origin/upgrate'.
 nothing to commit, working tree clean
 *
 *
 * @returns {Object} .code: 0 命令正确执行，其他为错误
 */
function status () {
  // http://nodejs.cn/api/child_process.html#child_process_child_process_spawnsync_command_args_options
  // child_process.spawnSync(command[, args][, options])
  // command <string> 要运行的命令。
  // args <Array> 字符串参数列表。
  // options <Object>
  //   cwd <string> 子进程的当前工作目录。
  //   input <string> | <Buffer> | <Uint8Array> 要作为 stdin 传给衍生进程的值。
  //     提供该值会覆盖 stdio[0]
  //   stdio <string> | <Array> 子进程的 stdio 配置。
  //   env <Object> 环境变量键值对。
  //   uid <number> 设置该进程的用户标识。（详见 setuid(2)）
  //   gid <number> 设置该进程的组标识。（详见 setgid(2)）
  //   timeout <number> 进程允许运行的最大时间数，以毫秒为单位。默认为 undefined。
  //   killSignal <string> | <integer> 当衍生进程将被杀死时要使用的信号值。默认为 'SIGTERM'。
  //   maxBuffer <number> stdout 或 stderr 允许的最大字节数。 默认为 200*1024。 如果超过限制，则子进程会被终止。 See caveat at maxBuffer and Unicode.
  //   encoding <string> 用于所有 stdio 输入和输出的编码。默认为 'buffer'。
  //   shell <boolean> | <string> 如果为 true，则在一个 shell 中运行 command。 在 UNIX 上使用 '/bin/sh'，在 Windows 上使用 process.env.ComSpec。 一个不同的 shell 可以被指定为字符串。 See Shell Requirements and Default Windows Shell. 默认为 false（没有 shell）。
  //   windowsHide <boolean> Hide the subprocess console window that would normally be created on Windows systems. Default: false.
  // 返回: <Object>
  // pid <number> 子进程的 pid。
  // output <Array> stdio 输出返回的结果数组。
  // stdout <Buffer> | <string> output[1] 的内容。
  // stderr <Buffer> | <string> output[2] 的内容。
  // status <number> 子进程的退出码。
  // signal <string> 用于杀死子进程的信号。
  // error <Error> 如果子进程失败或超时产生的错误对象。
  // let command = 'git'
  // let args = 'status'.split(' ')
  // let options = {encoding: 'utf8'}
  // let gitStatus = require('child_process').spawnSync(command, args, options)

  return exec2(cmds.status)
}

/**
 * 获取分支状态变更的信息
 * @returns {String} 空字符串表示已无提交或推
 */
function getChangedMsg () {
  let gitStatusStdout = execSync(cmds.status, {encoding: 'utf8'}).trim()
  let msg = ''
  if (/^\s*\(use\s+["']git\s+(add|push)/mi.test(gitStatusStdout)) {
    switch (RegExp.$1) {
      case 'add':
        msg = '还有未提交的更改！请先完成提交！'
        break
      case 'push':
        msg = '还有未推的本地提交！请先完成推！'
        break
    }
  }
  msg && console.log(msg)
  return msg
}

/**
 * 判断分支状态都已提交和推了
 * @returns {Boolean}
 */
function isReady () {
  return !getChangedMsg()
}

module.exports = {
  gitCmd,
  cmds,
  current,
  currentId,
  currentTag,
  describeTag,
  exec2,
  lastTag,
  fetch,
  pull,
  checkout,
  trackRemote,
  revert,
  resetHard,
  update,
  revertUpdate,
  pushRecord,
  status,
  getChangedMsg,
  isReady
}
