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
 * @param format 输出格式，支持：YYYY(年), MM(月), DD(日), HH(时), mm(分), ss(秒)
 * @returns 格式化后的时间字符串
 */
export const formatDateTime = (dateString: string, format: string = 'YYYY-MM-DD HH:mm:ss'): string => {
    if (!dateString) return '';
    
    try {
        // 预处理输入的时间字符串，处理非标准格式
        let normalizedString = dateString;
        // 处理类似 2024-04-23T14:30:42:780+08:00 格式（秒与毫秒之间用冒号）
        normalizedString = normalizedString.replace(/(\d{2}):(\d{2}):(\d{2}):(\d{3})/, '$1:$2:$3.$4');
        return DateTime.fromISO(normalizedString).toFormat(format);
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
};