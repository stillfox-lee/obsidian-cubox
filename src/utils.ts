import { DateTime } from 'luxon';

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
 * 格式化时间字符串为指定格式
 * @param dateString 输入的时间字符串
 * @param format 输出格式
 * @returns 格式化后的时间字符串
 */
export const formatDateTime = (dateString: string, format: string = 'yyyy-MM-dd HH:mm:ss'): string => {
    if (!dateString) return '';
    
    try {
        const dt = DateTime.fromISO(dateString);
        if (!dt.isValid) {
            return dateString; // Return original string for invalid dates
        }
        return dt.toFormat(format);    
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString; // Return original string on error
    }
};