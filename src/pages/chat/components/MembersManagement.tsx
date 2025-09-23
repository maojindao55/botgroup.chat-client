import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserPlus, Mic, MicOff, Edit2, Check, X } from 'lucide-react';
import { type AICharacter } from "@/config/aiCharacters";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useState } from 'react';

interface User {
  id: number | string;
  name: string;
  avatar?: string;
}

interface MembersManagementProps {
  showMembers: boolean;
  setShowMembers: (show: boolean) => void;
  users: (User | AICharacter)[];
  mutedUsers: string[];
  handleToggleMute: (userId: string) => void;
  getAvatarData: (name: string) => { backgroundColor: string; text: string };
  isGroupDiscussionMode: boolean;
  onToggleGroupDiscussion: () => void;
  groupName: string;
  onGroupNameChange: (newName: string) => void;
}

export const MembersManagement = ({
  showMembers,
  setShowMembers,
  users,
  mutedUsers,
  handleToggleMute,
  getAvatarData,
  isGroupDiscussionMode,
  onToggleGroupDiscussion,
  groupName,
  onGroupNameChange
}: MembersManagementProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(groupName);

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== groupName) {
      onGroupNameChange(editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setEditedName(groupName);
    setIsEditingName(false);
  };

  return (
    <Sheet open={showMembers} onOpenChange={setShowMembers}>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>群聊配置</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">全员讨论模式</div>
                <div className="text-xs text-gray-500">开启后全员回复讨论</div>
              </div>
              <Switch
                checked={isGroupDiscussionMode}
                onCheckedChange={onToggleGroupDiscussion}
              />
            </div>
          </div>
          {/* 群名称编辑区域 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-2">
                <div className="text-sm text-gray-500 mb-1">群名称</div>
                {isEditingName ? (
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-sm"
                    placeholder="请输入群名称"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveName();
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                  />
                ) : (
                  <div className="text-sm font-medium">{groupName}</div>
                )}
              </div>
              <div className="flex gap-1">
                {isEditingName ? (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleSaveName}
                          >
                            <Check className="w-4 h-4 text-green-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>保存</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleCancelEdit}
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>取消</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setIsEditingName(true)}
                        >
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>编辑群名称</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">当前成员（{users.length}）</span>
            <Button variant="outline" size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              添加成员
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-150px)]">
            <div className="space-y-2 pr-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {'avatar' in user && user.avatar ? (
                        <AvatarImage src={user.avatar} className="w-10 h-10" />
                      ) : (
                        <AvatarFallback style={{ backgroundColor: getAvatarData(user.name).backgroundColor, color: 'white' }}>
                          {user.name[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      {mutedUsers.includes(user.id as string) && (
                        <span className="text-xs text-red-500">已禁言</span>
                      )}
                    </div>
                  </div>
                  {user.name !== "我" && (
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleMute(user.id as string)}
                            >
                              {mutedUsers.includes(user.id as string) ? (
                                <MicOff className="w-4 h-4 text-red-500" />
                              ) : (
                                <Mic className="w-4 h-4 text-green-500" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {mutedUsers.includes(user.id as string) ? '取消禁言' : '禁言'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}; 