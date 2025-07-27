package io.github.mucsi96.learnlanguage.util;

import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;

import java.beans.PropertyDescriptor;
import java.util.HashSet;
import java.util.Set;

public class BeanUtils {

    /**
     * Gets the names of properties that are null in the given object.
     * This is useful for selective property copying where null values should be ignored.
     *
     * @param source the object to check for null properties
     * @return array of property names that have null values
     */
    public static String[] getNullPropertyNames(Object source) {
        final BeanWrapper src = new BeanWrapperImpl(source);
        PropertyDescriptor[] pds = src.getPropertyDescriptors();
        Set<String> emptyNames = new HashSet<>();
        for (PropertyDescriptor pd : pds) {
            Object srcValue = src.getPropertyValue(pd.getName());
            if (srcValue == null) {
                emptyNames.add(pd.getName());
            }
        }
        return emptyNames.toArray(new String[0]);
    }

    /**
     * Copies non-null properties from source to target.
     * This is a convenience method that combines Spring's BeanUtils.copyProperties
     * with automatic null property exclusion.
     *
     * @param source the source object
     * @param target the target object
     */
    public static void copyNonNullProperties(Object source, Object target) {
        org.springframework.beans.BeanUtils.copyProperties(source, target, getNullPropertyNames(source));
    }
}