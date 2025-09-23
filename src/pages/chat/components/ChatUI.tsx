import React, { useState, useRef, useEffect } from 'react';
import { Send, Share2, Settings2, ChevronLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { request } from '@/utils/request';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

import type { AICharacter } from "@/config/aiCharacters";
import type { Group as ApiGroup } from "@/services/groupService";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { SharePoster } from '@/pages/chat/components/SharePoster';
import { MembersManagement } from '@/pages/chat/components/MembersManagement';
import Sidebar from './Sidebar';
import { AdBanner, AdBannerMobile } from './AdSection';
import { useUserStore } from '@/store/userStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { getAvatarData } from '@/utils/avatar';
import { GroupService } from '@/services/groupService';

// 定义消息接口
interface Message {
  id: number;
  sender: User;
  content: string;
  isAI: boolean;
  isError?: boolean;
}

// 定义本地Group接口（兼容现有代码）
interface Group {
  id: string;
  name: string;
  description?: string;
  members: string[];
  isGroupDiscussionMode: boolean;
}

// 定义用户接口
interface User {
  id: number | string;
  name: string;
  avatar?: string;
}

// 修改 KaTeXStyle 组件
const KaTeXStyle = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    /* 只在聊天消息内应用 KaTeX 样式 */
    .chat-message .katex-html {
      display: none;
    }
    
    .chat-message .katex {
      font: normal 1.1em KaTeX_Main, Times New Roman, serif;
      line-height: 1.2;
      text-indent: 0;
      white-space: nowrap;
      text-rendering: auto;
    }
    
    .chat-message .katex-display {
      display: block;
      margin: 1em 0;
      text-align: center;
    }
    
    /* 其他必要的 KaTeX 样式 */
    @import "katex/dist/katex.min.css";
  `}} />
);


const ChatUI = () => {
  const userStore = useUserStore();
  const isMobile = useIsMobile();

  //获取url参数
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id')? parseInt(urlParams.get('id')!) : 0;
  const index = urlParams.get('index')? parseInt(urlParams.get('index')!) : 0;
  // 1. 所有的 useState 声明
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(index);
  const [selectedGroupId, setSelectedGroupId] = useState(id);
  const [group, setGroup] = useState<Group | null>(null);
  const [groupAiCharacters, setGroupAiCharacters] = useState<AICharacter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isGroupDiscussionMode, setIsGroupDiscussionMode] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [allNames, setAllNames] = useState<string[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showAd, setShowAd] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [pendingContent, setPendingContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [showPoster, setShowPoster] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // 默认关闭，稍后根据设备类型设置

  // 根据设备类型设置侧边栏默认状态
  useEffect(() => {
    if (isMobile !== undefined) {
      setSidebarOpen(!isMobile); // 手机端关闭，PC端开启
    }
  }, [isMobile]);

  // 2. 所有的 useRef 声明
  const currentMessageRef = useRef<number | null>(null);
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedContentRef = useRef(""); 
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const abortController = useRef(new AbortController());

  // 添加一个 ref 来跟踪是否已经初始化
  const isInitialized = useRef(false);

  // 3. 所有的 useEffect
  useEffect(() => {
    // 如果已经初始化过，则直接返回
    if (isInitialized.current) return;

    const initData = async () => {
      try {
        const response = await request(`/api/init`);
        if (!response.ok) {
          throw new Error('初始化数据失败');
        }
        const {data} = await response.json();
        console.log("初始化数据", data);
        
        // 自动获取最新的群组列表
        try {
          const groupsResponse = await GroupService.getGroups();
          if (groupsResponse.success && groupsResponse.data) {
            // 将API返回的群组列表转换为本地格式
            const apiGroups = groupsResponse.data;
            const localGroups: Group[] = apiGroups.map(apiGroup => ({
              id: apiGroup.id.toString(),
              name: apiGroup.name,
              description: apiGroup.description,
              members: apiGroup.characters?.map(c => c.id.toString()) || [],
              isGroupDiscussionMode: false // 默认值，可以根据需要调整
            }));

            setGroups(data.groups.concat(localGroups));
            console.log("获取群组列表成功", localGroups);
          } else {
            console.error("获取群组列表失败", groupsResponse.message);
            // 如果API失败，使用初始化数据中的群组
            setGroups(data.groups);
          }
        } catch (error) {
          console.error("获取群组列表出错:", error);
          // 如果API出错，使用初始化数据中的群组
          setGroups(data.groups);
        }
        
        let group = null;
        //如果groupid不为空，则根据groupid获取group
        if (selectedGroupId) {
            const groupResponse = await GroupService.getGroup(selectedGroupId);
            if (groupResponse.success && groupResponse.data) {
              // 将API返回的Group转换为本地Group格式
              const apiGroup = groupResponse.data;
              const localGroup: Group = {
                id: apiGroup.id.toString(),
                name: apiGroup.name,
                description: apiGroup.description,
                members: apiGroup.characters?.map(c => c.id.toString()) || [],
                isGroupDiscussionMode: false // 默认值，可以根据需要调整
              };
              group = localGroup;
              console.log("获取群组详情成功", localGroup);
            } else {
              console.error("获取群组详情失败", groupResponse.message);
              // 如果获取特定群组失败，使用群组列表中的群组
              group = data.groups[selectedGroupIndex];
            }
        } else {
           group = data.groups[selectedGroupIndex];
        }
        //const group = data.groups[selectedGroupIndex];
        const characters = data.characters;
        setGroup(group);
        setIsInitializing(false);
        setIsGroupDiscussionMode(group.isGroupDiscussionMode);
        const groupAiCharacters = characters
          .filter((character: any) => group.members.includes(character.id))
          .filter((character: any) => character.personality !== "sheduler")
          .sort((a: any, b: any) => {
            return group.members.indexOf(a.id) - group.members.indexOf(b.id);
          });
        setGroupAiCharacters(groupAiCharacters);
        const allNames = groupAiCharacters.map((character: any) => character.name);
        allNames.push('user');
        let avatar_url = null;
        let nickname = '我';
        setAllNames(allNames);
        if (data.user && data.user != null) {
          const response1 = await request('/api/user/info');
          const userInfo = await response1.json();
          //设置store
          userStore.setUserInfo(userInfo.data);
          avatar_url = userInfo.data.avatar_url;
          nickname = userInfo.data.nickname;
        } else {
          // 设置空的用户信息
          userStore.setUserInfo({
            id: 0,
            phone: '',
            nickname: nickname,
            avatar_url: null,
            status: 0
          });
        }
        setUsers([
          { id: 1, name: nickname, avatar: avatar_url || undefined },
          ...groupAiCharacters
        ]);
      } catch (error) {
        console.error("初始化数据失败:", error);
        setIsInitializing(false);
      }
    };

    initData();
    // 标记为已初始化
    isInitialized.current = true;
  }, [userStore]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      setShowAd(false);
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
      }
    };
  }, []);

  // 添加一个新的 useEffect 来监听 userStore.userInfo 的变化
  useEffect(() => {
    if (userStore.userInfo && users.length > 0) {
      setUsers(prev => [
        { id: 1, name: userStore.userInfo.nickname, avatar: userStore.userInfo.avatar_url || undefined },
        ...prev.slice(1) // 保留其他 AI 角色
      ]);
    }
  }, [userStore.userInfo]); // 当 userInfo 变化时更新 users

  // 4. 工具函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleRemoveUser = (userId: number) => {
    setUsers(users.filter(user => user.id !== userId));
  };

  const handleToggleMute = (userId: string) => {
    setMutedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleShareChat = () => {
    setShowPoster(true);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // 5. 加载检查
  if (isInitializing || !group) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-orange-50 via-orange-50/70 to-orange-100 flex items-center justify-center">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  const handleSendMessage = async () => {
    //判断是否Loding
    if (isLoading) return;
    if (!inputMessage.trim()) return;

    // 添加用户消息
    const userMessage = {
      id: messages.length + 1,
      sender: users[0],
      content: inputMessage,
      isAI: false
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setPendingContent("");
    accumulatedContentRef.current = "";

    // 构建历史消息数组
    let messageHistory = messages.map(msg => ({
      role: 'user',
      content: msg.sender.name == userStore.userInfo.nickname ? 'user：' + msg.content :  msg.sender.name + '：' + msg.content,
      name: msg.sender.name
    }));
    let selectedGroupAiCharacters = groupAiCharacters;
    if (!isGroupDiscussionMode) {
      const shedulerResponse = await request(`/api/scheduler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputMessage, history: messageHistory, availableAIs: groupAiCharacters })
      });
      const shedulerData = await shedulerResponse.json();
      const selectedAIs = shedulerData.selectedAIs;
      selectedGroupAiCharacters = selectedAIs.map((ai: any) => groupAiCharacters.find(c => c.id === ai));
    }
    for (let i = 0; i < selectedGroupAiCharacters.length; i++) {
      //禁言
      if (mutedUsers.includes(selectedGroupAiCharacters[i].id)) {
        continue;
      }
      // 创建当前 AI 角色的消息
      const aiMessage = {
        id: messages.length + 2 + i,
        sender: { id: selectedGroupAiCharacters[i].id, name: selectedGroupAiCharacters[i].name, avatar: selectedGroupAiCharacters[i].avatar },
        content: "",
        isAI: true
      };
      
      // 添加当前 AI 的消息
      setMessages(prev => [...prev, aiMessage]);
      let uri = "/api/chat";
      if ((selectedGroupAiCharacters[i] as any).rag == true) {
        uri = "/rag/query";
      }
      try {
        const response = await request(uri, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedGroupAiCharacters[i].model,
            message: inputMessage,
            query: inputMessage,
            personality: selectedGroupAiCharacters[i].personality,
            history: messageHistory,
            index: i,
            aiName: selectedGroupAiCharacters[i].name,
            rag: (selectedGroupAiCharacters[i] as any).rag,
            knowledge: (selectedGroupAiCharacters[i] as any).knowledge,
            custom_prompt: (selectedGroupAiCharacters[i].custom_prompt || '').replace('#groupName#', group.name) + "\n" + (group.description || '')
          }),
        });

        if (!response.ok) {
          throw new Error('请求失败');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('无法获取响应流');
        }

        let buffer = '';
        let completeResponse = ''; // 用于跟踪完整的响应
        // 添加超时控制
        const timeout = 10000; // 10秒超时
        while (true) {
          //console.log("读取中")
          const startTime = Date.now();
          let result = await Promise.race([
            reader.read(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('响应超时')), timeout - (Date.now() - startTime))
            )
          ]) as ReadableStreamReadResult<Uint8Array>;
          let { done, value } = result;

          if (Date.now() - startTime > timeout) {
            reader.cancel();
            console.log("读取超时")
            if (completeResponse.trim() === "") {
              throw new Error('响应超时');
            }
            done = true;
          }

          if (done) {
            //如果completeResponse为空，
            if (completeResponse.trim() === "") {
            completeResponse = "对不起，我还不够智能，服务又断开了。";
            setMessages(prev => {
              const newMessages = [...prev];
              const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
              if (aiMessageIndex !== -1) {
                newMessages[aiMessageIndex] = {
                  ...newMessages[aiMessageIndex],
                  content: completeResponse
                };
              }
              return newMessages;
            });}
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  completeResponse += data.content;
                  //正则去掉前面的任何AI名称：格式
                  completeResponse = completeResponse.replace(new RegExp(`^(${allNames.join('|')})：`, 'i'), '');
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
                    if (aiMessageIndex !== -1) {
                      newMessages[aiMessageIndex] = {
                        ...newMessages[aiMessageIndex],
                        content: completeResponse
                      };
                    }
                    return newMessages;
                  });
                } 

              } catch (e) {
                console.error('解析响应数据失败:', e);
              }
            }
          }
        }

        // 将当前AI的回复添加到消息历史中，供下一个AI使用
        messageHistory.push({
          role: 'user',
          content: aiMessage.sender.name + '：' + completeResponse,
          name: aiMessage.sender.name
        });

        // 等待一小段时间再开始下一个 AI 的回复
        if (i < groupAiCharacters.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error("发送消息失败:", error);
        messageHistory.push({
          role: 'user',
          content: aiMessage.sender.name + "对不起，我还不够智能，服务又断开了(错误：" + (error instanceof Error ? error.message : String(error)) + ")。",
          name: aiMessage.sender.name
        });
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessage.id 
            ? { ...msg, content: "对不起，我还不够智能，服务又断开了(错误：" + (error instanceof Error ? error.message : String(error)) + ")。", isError: true }
            : msg
        ));
      }
    }
    
    setIsLoading(false);
  };

  const handleCancel = () => {
    abortController.current.abort();
  };

  // 处理群组选择
  const handleSelectGroup = (index: number) => {
    // 从groups数组中获取对应群组的id
    const groupId = groups[index]?.id;
    //进行跳转到?index=index&id=groupId
    window.location.href = `?index=${index}&id=${groupId}`;
    return;
  };

  return (
    <>
      <KaTeXStyle />
      <div className="fixed inset-0 bg-gradient-to-br from-orange-50 via-orange-50/70 to-orange-100 flex items-start md:items-center justify-center overflow-hidden">
        <div className="h-full flex bg-white w-full mx-auto relative shadow-xl md:max-w-5xl md:h-[96dvh] md:my-auto md:rounded-lg">
          {/* 传递 selectedGroupIndex 和 onSelectGroup 回调给 Sidebar */}
          <Sidebar 
            isOpen={sidebarOpen} 
            toggleSidebar={toggleSidebar} 
            selectedGroupIndex={selectedGroupIndex}
            onSelectGroup={handleSelectGroup}
            groups={groups as any}
            onGroupsChange={setGroups as any}
          />
          
          {/* 聊天主界面 */}
          <div className="flex flex-col flex-1">
            {/* Header */}
            <header className="bg-white shadow flex-none md:rounded-t-lg">
              <div className="flex items-center justify-between px-0 py-1.5">
                {/* 左侧群组信息 */}
                <div className="flex items-center md:px-2.5">
                  <div 
                    className="md:hidden flex items-center justify-center m-1  cursor-pointer" 
                    onClick={toggleSidebar}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </div>
                  
                  <h1 className="font-medium text-base -ml-1">{group.name}({users.length})</h1>
                </div>

                
                {/* 右侧头像组和按钮 */}
                <div className="flex items-center">
                {/* 广告位 手机端不展示 */}
                 <div className="hidden md:block">
                   <AdBanner show={showAd} closeAd={() => setShowAd(false)} />
                 </div>
                
                  <div className="flex -space-x-2 ">
                    {users.slice(0, 4).map((user) => {
                      const avatarData = getAvatarData(user.name);
                      return (
                        <TooltipProvider key={user.id}>
                          <Tooltip>
                            <TooltipTrigger>
                              <Avatar className="w-7 h-7 border-2 border-white">
                                {'avatar' in user && user.avatar && user.avatar !== null ? (
                                  <AvatarImage src={user.avatar} />
                                ) : (
                                  <AvatarFallback style={{ backgroundColor: avatarData.backgroundColor, color: 'white' }}>
                                    {avatarData.text}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{user.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                    {users.length > 4 && (
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs border-2 border-white">
                        +{users.length - 4}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowMembers(true)}>
                    <Settings2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </header>

            {/* Main Chat Area */}
            <div className="flex-1 overflow-hidden bg-gray-100">

              <ScrollArea className={`h-full ${!showAd ? 'px-2 py-1' : ''} md:px-2 md:py-1`} ref={chatAreaRef}>
                <div className="md:hidden">
                  <AdBannerMobile show={showAd} closeAd={() => setShowAd(false)} />
                </div>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} 
                      className={`flex items-start gap-2 ${message.sender.name === userStore.userInfo.nickname ? "justify-end" : ""}`}>
                      {message.sender.name !== userStore.userInfo.nickname && (
                        <Avatar>
                          {'avatar' in message.sender && message.sender.avatar ? (
                            <AvatarImage src={message.sender.avatar} className="w-10 h-10" />
                          ) : (
                          <AvatarFallback style={{ backgroundColor: getAvatarData(message.sender.name).backgroundColor, color: 'white' }}>
                            {message.sender.name[0]}
                          </AvatarFallback>
                          )}
                        </Avatar>
                      )}
                      <div className={message.sender.name === userStore.userInfo.nickname ? "text-right" : ""}>
                        <div className="text-sm text-gray-500">{message.sender.name}</div>
                        <div className={`mt-1 p-3 rounded-lg shadow-sm chat-message ${
                          message.sender.name === userStore.userInfo.nickname ? "bg-blue-500 text-white text-left" : "bg-white"
                        }`}>
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            className={`prose dark:prose-invert max-w-none ${
                              message.sender.name === userStore.userInfo.nickname ? "text-white [&_*]:text-white" : ""
                            }
                            [&_h2]:py-1
                            [&_h2]:m-0
                            [&_h3]:py-1.5
                            [&_h3]:m-0
                            [&_p]:m-0 
                            [&_pre]:bg-gray-900 
                            [&_pre]:p-2
                            [&_pre]:m-0 
                            [&_pre]:rounded-lg
                            [&_pre]:text-gray-100
                            [&_pre]:whitespace-pre-wrap
                            [&_pre]:break-words
                            [&_pre_code]:whitespace-pre-wrap
                            [&_pre_code]:break-words
                            [&_code]:text-sm
                            [&_code]:text-gray-400
                            [&_code:not(:where([class~="language-"]))]:text-pink-500
                            [&_code:not(:where([class~="language-"]))]:bg-transparent
                            [&_a]:text-blue-500
                            [&_a]:no-underline
                            [&_ul]:my-2
                            [&_ol]:my-2
                            [&_li]:my-1
                            [&_blockquote]:border-l-4
                            [&_blockquote]:border-gray-300
                            [&_blockquote]:pl-4
                            [&_blockquote]:my-2
                            [&_blockquote]:italic`}
                          >
                            {message.content}
                          </ReactMarkdown>
                          {message.isAI && isTyping && currentMessageRef.current === message.id && (
                            <span className="typing-indicator ml-1">▋</span>
                          )}
                        </div>
                      </div>
                      {message.sender.name === userStore.userInfo.nickname && (
                        <Avatar>
                         {'avatar' in message.sender && message.sender.avatar ? (
                            <AvatarImage src={message.sender.avatar} className="w-10 h-10" />
                          ) : (
                          <AvatarFallback style={{ backgroundColor: getAvatarData(message.sender.name).backgroundColor, color: 'white' }}>
                            {message.sender.name[0]}
                          </AvatarFallback>
                          )}
                        </Avatar>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                  {/* 添加一个二维码 */}
                  <div id="qrcode" className="flex flex-col items-center hidden">
                    <img src="/img/qr.png" alt="QR Code" className="w-24 h-24" />
                    <p className="text-sm text-gray-500 mt-2 font-medium tracking-tight bg-gray-50 px-3 py-1 rounded-full">扫码体验AI群聊</p>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="bg-white border-t py-3 px-2 md:rounded-b-lg">
              <div className="flex gap-1 pb-[env(safe-area-inset-bottom)]">
                {messages.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline"
                          size="icon"
                          onClick={handleShareChat}
                          className="px-3"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>分享聊天记录</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <Input 
                  placeholder="输入消息..." 
                  className="flex-1"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Members Management Dialog */}
        <MembersManagement 
          showMembers={showMembers}
          setShowMembers={setShowMembers}
          users={users}
          mutedUsers={mutedUsers}
          handleToggleMute={handleToggleMute}
          isGroupDiscussionMode={isGroupDiscussionMode}
          onToggleGroupDiscussion={() => setIsGroupDiscussionMode(!isGroupDiscussionMode)}
          getAvatarData={getAvatarData}
          groupName={group?.name || ''}
          onGroupNameChange={(newName: string) => {
            if (group) {
              setGroup({...group, name: newName});
            }
          }}
        />
      </div>

      {/* 添加 SharePoster 组件 */}
      <SharePoster 
        isOpen={showPoster}
        onClose={() => setShowPoster(false)}
        chatAreaRef={chatAreaRef}
      />
    </>
  );
};

export default ChatUI;