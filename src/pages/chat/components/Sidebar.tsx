import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { MessageSquareIcon, PlusCircleIcon, MenuIcon, PanelLeftCloseIcon, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import GitHubButton from 'react-github-btn';
import '@fontsource/audiowide';
// import { AdSection } from './AdSection';
import { UserSection } from './UserSection';
import { GroupSettings } from './GroupSettings';
import { GroupService } from '@/services/groupService';
import { toast } from 'sonner';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// 根据群组ID生成固定的随机颜色
const getRandomColor = (index: number) => {
  const colors = ['blue', 'green', 'yellow', 'purple', 'pink', 'indigo', 'red', 'orange', 'teal'];
  //增加hash
  const hashCode = index.toString().split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return colors[hashCode % colors.length];
};

// Group 接口定义
interface Group {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  memberCount?: number;
  isPrivate?: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  selectedGroupIndex?: number;
  onSelectGroup?: (index: number) => void;
  groups?: Group[];
  onCreateGroup?: (groupInfo: Group) => void;
  onGroupsChange?: (groups: Group[]) => void;
}

const Sidebar = ({ 
  isOpen, 
  toggleSidebar, 
  selectedGroupIndex = 0, 
  onSelectGroup, 
  groups: propGroups, 
  onCreateGroup,
  onGroupsChange 
}: SidebarProps) => {
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [localGroups, setLocalGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 使用本地状态或传入的 groups
  const groups = propGroups || localGroups;

  // 获取群组列表
  const fetchGroups = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const response = await GroupService.getGroups();
      if (response.success) {
        const fetchedGroups = response.data.map(group => ({
          id: group.id.toString(),
          name: group.name,
          description: group.description,
          memberCount: group.characters?.length || 0,
          isPrivate: false
        }));
        
        // 获取现有的群组数据
        const existingGroups = propGroups || localGroups;
        
        // 合并数据：保留现有数据，追加新数据（去重）
        const mergedGroups = [...existingGroups];
        fetchedGroups.forEach(newGroup => {
          // 检查是否已存在相同ID的群组
          const existingIndex = mergedGroups.findIndex(group => group.id === newGroup.id);
          if (existingIndex >= 0) {
            // 如果存在，更新现有群组信息
            mergedGroups[existingIndex] = newGroup;
          } else {
            // 如果不存在，追加到列表
            mergedGroups.push(newGroup);
          }
        });
        
        // 更新本地状态
        setLocalGroups(mergedGroups);
        
        // 通知父组件群组数据已更新
        onGroupsChange?.(mergedGroups);
      }
    } catch (error: any) {
      console.error('获取群组列表失败:', error);
      toast.error(error.message || '获取群组列表失败');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // 组件挂载时获取群组列表
  useEffect(() => {
    if (!propGroups) {
      fetchGroups();
    }
  }, [propGroups]);

  // 处理创建群聊
  const handleCreateGroup = (groupInfo: any) => {
    const newGroup: Group = {
      id: groupInfo.id || Date.now().toString(),
      name: groupInfo.name,
      description: groupInfo.description,
      memberCount: groupInfo.memberCount || 1,
      isPrivate: groupInfo.isPrivate || false
    };
    
    // 获取现有的群组数据并添加新群组
    const existingGroups = propGroups || localGroups;
    const updatedGroups = [...existingGroups, newGroup];
    
    // 更新本地群组列表
    setLocalGroups(updatedGroups);
    
    // 通知父组件
    onCreateGroup?.(newGroup);
    onGroupsChange?.(updatedGroups);
    setShowGroupSettings(false);
  };

  // 处理刷新群组列表
  const handleRefresh = () => {
    fetchGroups(false);
  };

  return (
    <>
      {/* 侧边栏 - 在移动设备上可以隐藏，在桌面上始终显示 */}
      <div 
        className={cn(
          "transition-all duration-300 ease-in-out",
          "fixed md:relative z-20 h-full",
          isOpen ? "w-48 translate-x-0" : "w-0 md:w-14 -translate-x-full md:translate-x-0"
        )}
      >
        <div className="h-full border-r bg-background rounded-l-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/40">
            <div className="flex-1 flex items-center">
              <span className={cn(
                "font-medium text-base text-foreground/90 transition-all duration-200 whitespace-nowrap overflow-hidden",
                isOpen ? "opacity-100 max-w-full mr-2 pl-3" : "opacity-0 max-w-0 md:max-w-0"
              )}>
                群列表
              </span>
              
              {/* 刷新按钮 */}
              {isOpen && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="mr-1 h-7 w-7"
                      >
                        <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>刷新群列表</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSidebar}
                className={cn(
                  "text-muted-foreground hover:text-primary",
                  isOpen ? "ml-auto" : "mx-auto md:ml-auto"
                )}
              >
                {isOpen ? <PanelLeftCloseIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-2">
            <nav className="space-y-1.5">
              {isLoading ? (
                // 加载状态
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-md">
                      <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : groups.length === 0 ? (
                // 空状态
                <div className="text-center py-8 text-gray-500">
                  <MessageSquareIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">暂无群聊</p>
                  <p className="text-xs">点击下方创建新群聊</p>
                </div>
              ) : (
                // 群组列表
                groups.map((group, index) => (
                <a 
                  key={group.id}
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectGroup?.(index, parseInt(group.id));
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent/80 group",
                    !isOpen && "md:justify-center",
                    selectedGroupIndex === index && "bg-accent"
                  )}
                >
                  <MessageSquareIcon 
                    className={`h-5 w-5 flex-shrink-0 group-hover:opacity-80 text-${getRandomColor(index)}-500 group-hover:text-${getRandomColor(index)}-600`} 
                  />
                  <span className={cn(
                    "transition-all duration-200 whitespace-nowrap overflow-hidden text-foreground/90",
                    isOpen ? "opacity-100 max-w-full" : "opacity-0 max-w-0 md:max-w-0"
                  )}>{group.name}</span>
                </a>
                ))
              )}
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a 
                      href="#" 
                      className={cn(
                        "flex items-center gap-1 rounded-md px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent/80 group mt-3",
                        !isOpen && "md:justify-center"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setShowGroupSettings(true);
                      }}
                    >
                      <PlusCircleIcon className="h-5 w-5 flex-shrink-0 text-amber-500 group-hover:text-amber-600" />
                      <span className={cn(
                        "transition-all duration-200 whitespace-nowrap overflow-hidden text-foreground/90",
                        isOpen ? "opacity-100 max-w-full" : "opacity-0 max-w-0 md:max-w-0"
                      )}>创建新群聊</span>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>创建新群聊</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </nav>
          </div>
          
          {/* 广告位 
          <AdSection isOpen={isOpen} />
          */}

          {/* 用户信息模块 */}
          <UserSection isOpen={isOpen} />

          {/* GitHub Star Button - 只在侧边栏打开时显示，放在底部 */}
          <div className="px-3 py-2 mt-auto">
            {/* 标题移至底部 */}
            <div className="flex items-center justify-left mb-3">
              <a href="/" className="flex items-center">
                <span 
                  style={{ fontFamily: 'Audiowide, system-ui', color: '#ff6600' }} 
                  className={cn(
                    "transition-all duration-200 whitespace-nowrap overflow-hidden",
                    isOpen ? "text-lg" : "text-xs max-w-0 opacity-0 md:max-w-0"
                  )}
                >
                  botgroup.chat
                </span>
              </a>
            </div>
            
            {isOpen && (
              <div className="flex items-center justify-left h-8">
                <GitHubButton 
                  href="https://github.com/maojindao55/botgroup.chat"
                  data-color-scheme="no-preference: light; light: light; dark: light;"
                  data-size="large"
                  data-show-count="true"
                  aria-label="Star maojindao55/botgroup.chat on GitHub"
                >
                  Star
                </GitHubButton>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 移动设备上的遮罩层，点击时关闭侧边栏 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-10 md:hidden" 
          onClick={toggleSidebar}
        />
      )}

      {/* 群聊设置组件 */}
      <GroupSettings
        isOpen={showGroupSettings}
        onClose={() => setShowGroupSettings(false)}
        mode="create"
        onSave={handleCreateGroup}
      />
    </>
  );
};

export default Sidebar; 