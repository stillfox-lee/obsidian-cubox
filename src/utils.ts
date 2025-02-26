// 文件名非法字符正则表达式
export const ILLEGAL_CHAR_REGEX_FILE = /[<>:"/\\|?*\u0000-\u001F]/g;
export const ILLEGAL_CHAR_REGEX_FOLDER = /[<>:"\\|?*\u0000-\u001F]/g;
export const REPLACEMENT_CHAR = '-';

/**
 * 处理文件名中的非法字符
 * @param str 原始字符串
 * @returns 处理后的安全字符串
 */
export const replaceIllegalCharsFile = (str: string): string => {
    return str.replace(ILLEGAL_CHAR_REGEX_FILE, REPLACEMENT_CHAR);
};

/**
 * 处理文件夹名中的非法字符
 * @param str 原始字符串
 * @returns 处理后的安全字符串
 */
export const replaceIllegalCharsFolder = (str: string): string => {
    return str.replace(ILLEGAL_CHAR_REGEX_FOLDER, REPLACEMENT_CHAR);
};

/**
 * 生成安全的文章文件名
 * @param title 文章标题
 * @returns 安全的文件名
 */
export const generateSafeFileArticleName = (title: string): string => {
    const safeTitle = replaceIllegalCharsFile(title).trim();
    return safeTitle;
};

/**
 * 格式化 ISO 时间字符串为可读格式
 * @param isoString ISO 格式的时间字符串
 * @param format 可选的格式化模式
 * @returns 格式化后的时间字符串
 */
export const formatISODateTime = (isoString: string, format: string = 'yyyy-MM-dd HH:mm'): string => {
    if (!isoString) return '';
    
    try {
        // 直接使用 Date 对象处理时间
        const date = new Date(isoString);
        
        // 检查日期是否有效
        if (isNaN(date.getTime())) {
            return isoString;
        }
        
        // 根据不同格式返回不同的日期字符串
        if (format === 'yyyy-MM-dd HH:mm' || format === 'YYYY-MM-dd HH:mm') {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        } 
        else if (format === 'yyyy-MM-dd' || format === 'YYYY-MM-dd') {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        }
        
        // 默认返回原始字符串
        return isoString;
    } catch (error) {
        console.error('Error formatting ISO date:', error);
        return isoString;
    }
};

/**
 * 获取当前时间的格式化字符串
 * @param format 格式化模式
 * @returns 格式化后的当前时间字符串
 */
export const getCurrentFormattedTime = (format: string = 'yyyy-MM-dd HH:mm'): string => {
    return formatISODateTime(new Date().toISOString(), format);
}; 