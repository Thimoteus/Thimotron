if &cp | set nocp | endif
nnoremap <silent>  :nohlsearch
let s:cpo_save=&cpo
set cpo&vim
xmap S <Plug>VSurround
vmap [% [%m'gv``
vmap ]% ]%m'gv``
vmap a% [%v]%
nmap cs <Plug>Csurround
nmap ds <Plug>Dsurround
nmap gx <Plug>NetrwBrowseX
xmap gS <Plug>VgSurround
nmap ySS <Plug>YSsurround
nmap ySs <Plug>YSsurround
nmap yss <Plug>Yssurround
nmap yS <Plug>YSurround
nmap ys <Plug>Ysurround
nnoremap <silent> <Plug>NetrwBrowseX :call netrw#NetrwBrowseX(expand("<cWORD>"),0)
nnoremap <silent> <Plug>SurroundRepeat .
imap S <Plug>ISurround
imap s <Plug>Isurround
imap  <Plug>Isurround
inoremap  u
let &cpo=s:cpo_save
unlet s:cpo_save
set autoindent
set autoread
set backspace=indent,eol,start
set complete=.,w,b,u,t
set display=lastline
set expandtab
set fileencodings=ucs-bom,utf-8,default,latin1
set fileformats=unix,dos,mac
set formatoptions=tcqj
set helplang=en
set hidden
set history=1000
set incsearch
set laststatus=2
set listchars=tab:>\ ,trail:-,extends:>,precedes:<,nbsp:+
set nomodeline
set nrformats=hex
set printoptions=paper:a4
set ruler
set runtimepath=~/.vim,~/.vim/bundle/vim-coffee-script,~/.vim/bundle/vim-ls,~/.vim/bundle/vim-sensible,~/.vim/bundle/vim-surround,/var/lib/vim/addons,/usr/share/vim/vimfiles,/usr/share/vim/vim74,/usr/share/vim/vimfiles/after,/var/lib/vim/addons/after,~/.vim/bundle/vim-coffee-script/after,~/.vim/after
set scrolloff=1
set sessionoptions=blank,buffers,curdir,folds,help,tabpages,winsize
set shiftwidth=3
set showcmd
set sidescrolloff=5
set smarttab
set suffixes=.bak,~,.swp,.o,.info,.aux,.log,.dvi,.bbl,.blg,.brf,.cb,.ind,.idx,.ilg,.inx,.out,.toc
set tabpagemax=50
set tabstop=3
set tags=./tags;,./TAGS,tags,TAGS
set ttimeout
set ttimeoutlen=100
set viminfo=!,'100,<50,s10,h
set wildmenu
" vim: set ft=vim :
