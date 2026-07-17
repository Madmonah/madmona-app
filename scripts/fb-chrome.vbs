Set sh = CreateObject("WScript.Shell")
cmd = """C:\Program Files\Google\Chrome\Application\chrome.exe""" & _
      " --remote-debugging-port=9222" & _
      " --user-data-dir=""E:\madmona-app\scripts\.chrome-fb""" & _
      " --no-first-run --no-default-browser-check" & _
      " https://www.facebook.com/"
sh.Run cmd, 1, False
